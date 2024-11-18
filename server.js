const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const app = express();
const port = 3000;

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// API 키 확인을 위한 로그 추가
console.log('API 키 확인:', process.env.OPENAI_API_KEY ? 'API 키가 설정됨' : 'API 키가 설정되지 않음');

// YouTube 메타데이터 가져오기 함수
async function getVideoMetadata(videoUrl) {
    try {
        const metadata = JSON.parse(
            execSync(`yt-dlp -j '${videoUrl}'`, { encoding: 'utf-8' })
        );

        return {
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags || [],
            channel: metadata.channel,
            uploadDate: metadata.upload_date,
            duration: metadata.duration
        };
    } catch (error) {
        console.error('메타데이터 추출 오류:', error);
        throw error;
    }
}

// Whisper API 프롬프트 생성 함수 수정
function createEnhancedWhisperPrompt(metadata, summary) {
    return `
컨텍스트:
제목: ${metadata.title}
채널: ${metadata.channel}
태그: ${metadata.tags ? metadata.tags.join(' ') : '없음'}
설명: ${metadata.description || '설명 없음'}

영상 내용 요약:
${summary}

위 정보를 바탕으로, 한국어 구어체, 줄임말, 유행어, 은어, 속어 등이 포함된 음성을 정확하게 전사해주세요.
`.trim();
}

// 오디오 분할 및 변환 함수 (프롬프트 추가)
async function splitAndTranscribe(audioPath, durationInSeconds, prompt) {
    const segments = [];
    const segmentLength = 300; // 5분
    const totalSegments = Math.ceil(durationInSeconds / segmentLength);
    
    console.log(`총 ${totalSegments}개 세그먼트로 분할 처리 시작...`);
    
    for(let i = 0; i < totalSegments; i++) {
        const start = i * segmentLength;
        const segmentPath = path.join(__dirname, `segment_${i}.wav`);
        
        console.log(`[${i+1}/${totalSegments}] 세그먼트 처리 중...`);
        
        execSync(
            `ffmpeg -i "${audioPath}" -ss ${start} -t ${segmentLength} -ac 1 -ar 16000 "${segmentPath}"`
        );
        
        const audioStream = fs.createReadStream(segmentPath);
        const transcript = await openai.audio.transcriptions.create({
            file: audioStream,
            model: 'whisper-1',
            language: 'ko',
            prompt: prompt  // 프롬프트 추가
        });
        
        segments.push(transcript.text);
        fs.unlinkSync(segmentPath);
    }
    
    return segments.join(' ');
}

// GPT-4 Turbo로 요약하는 함수
async function summarizeTranscript(transcript, metadata) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",  // GPT-4 Turbo 모델
            messages: [
                {
                    role: "system",
                    content: "당신은 YouTube 영상 전사 내용을 요약하는 전문가입니다. 전사 내용을 5줄 이하로 핵심만 간단히 요약해주세요."
                },
                {
                    role: "user",
                    content: `
제목: ${metadata.title}
채널: ${metadata.channel}

전사 내용:
${transcript}

위 내용을 5줄 이하로 요약해주세요.`
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('요약 중 오류:', error);
        throw error;
    }
}

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// YouTube 변환 API 수정
app.post('/api/convert', async (req, res) => {
    const timestamp = Date.now();
    const outputPath = path.join(__dirname, `output_${timestamp}.wav`);
    
    try {
        const { videoUrl } = req.body;
        console.log('1. 변환 시작:', videoUrl);
        
        // 1. 메타데이터 가져오기
        const metadata = await getVideoMetadata(videoUrl);
        
        // 2. 음성 파일 추출
        execSync(
            `yt-dlp -x --audio-format wav --postprocessor-args "-ac 1 -ar 16000" -o '${outputPath}' '${videoUrl}'`
        );
        
        // 3. 1차 전사
        console.log('3. 1차 전사 시작...');
        const firstTranscript = await splitAndTranscribe(outputPath, metadata.duration);
        console.log('1차 전사 완료');
        
        // 4. GPT-4 Turbo로 요약
        console.log('4. 전사 내용 요약 중...');
        const summary = await summarizeTranscript(firstTranscript, metadata);
        
        // 5. 향상된 프롬프트로 2차 전사
        console.log('5. 2차 전사 시작...');
        const enhancedPrompt = createEnhancedWhisperPrompt(metadata, summary);
        const secondTranscript = await splitAndTranscribe(outputPath, metadata.duration, enhancedPrompt);
        console.log('2차 전사 완료');

        // 6. 임시 파일 삭제
        fs.unlinkSync(outputPath);

        console.log('변환 완료!');
        res.json({
            success: true,
            metadata: metadata,
            summary: summary,
            firstTranscript: firstTranscript,   // 1차 전사 결과
            secondTranscript: secondTranscript  // 2차 전사 결과
        });

    } catch (error) {
        try {
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
        } catch (e) {
            console.error('파일 삭제 중 오류:', e);
        }

        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: `2차 전사 실패: ${error.message}`
        });
    }
});

app.listen(port, () => {
    console.log(`서버가 http://localhost:3000 에서 실행 중입니다.`);
}); 