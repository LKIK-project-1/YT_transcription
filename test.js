const { execSync } = require('child_process');

console.log('=== 유튜브 메타데이터 추출 시작 ===');

const videoUrl = 'https://www.youtube.com/watch?v=7IW1kvtKp1o';

try {
    // 진행상황 표시
    console.log('URL:', videoUrl);
    console.log('메타데이터 가져오는 중...');
    
    // yt-dlp 실행하여 메타데이터 가져오기
    const result = execSync(`yt-dlp -j '${videoUrl}'`, {
        encoding: 'utf-8'
    });
    
    // JSON 파싱
    const metadata = JSON.parse(result);
    
    // 주요 정보 출력
    console.log('\n=== 영상 정보 ===');
    console.log('제목:', metadata.title);
    console.log('업로드 날짜:', metadata.upload_date);
    console.log('태그:', metadata.tags ? metadata.tags.join(', ') : '태그 없음');
    console.log('\n설명:\n', metadata.description || '설명 없음');
    
} catch (error) {
    console.error('에러 발생:', error.message);
}

console.log('\n=== 처리 완료 ===');