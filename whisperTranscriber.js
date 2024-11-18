const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // API 키는 환경변수로 관리
});

async function transcribeAudio(audioFilePath, contextInfo = '') {
    try {
        console.log('=== Whisper API 음성 인식 시작 ===');
        console.log('파일 경로:', audioFilePath);
        
        // 파일이 존재하는지 확인
        if (!fs.existsSync(audioFilePath)) {
            throw new Error('음성 파일을 찾을 수 없습니다.');
        }

        // 음성 파일 스트림 생성
        const audioStream = fs.createReadStream(audioFilePath);

        // Whisper API 호출
        console.log('음성 인식 처리 중...');
        const transcript = await openai.audio.transcriptions.create({
            file: audioStream,
            model: 'whisper-1',
            language: 'ko',
            prompt: `이 음성은 다음 컨텍스트의 한국어 영상입니다: ${contextInfo}`,
            response_format: 'text'
        });

        console.log('음성 인식 완료!');
        return transcript;

    } catch (error) {
        console.error('음성 인식 중 에러 발생:', error.message);
        throw error;
    }
}

// 테스트 실행
async function test() {
    const audioPath = path.join(__dirname, 'output.wav'); // 이전에 추출한 음성 파일
    const context = '[We Flash] aespa Fashion Survival Teaser'; // 영상 제목 등의 컨텍스트

    try {
        const result = await transcribeAudio(audioPath, context);
        console.log('\n=== 인식 결과 ===');
        console.log(result);
    } catch (error) {
        console.error('테스트 실패:', error);
    }
}

// 테스트 함수 실행
test();
