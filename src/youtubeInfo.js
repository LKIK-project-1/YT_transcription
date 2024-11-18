const { execSync } = require('child_process');

async function getVideoInfo(videoUrl) {
    if (!videoUrl) {
        throw new Error('비디오 URL이 제공되지 않았습니다.');
    }

    console.log('yt-dlp 실행 시작...');
    
    try {
        const result = execSync(`yt-dlp -J ${videoUrl}`, { encoding: 'utf-8' });
        const videoInfo = JSON.parse(result);

        console.log('yt-dlp 실행 완료');
        
        return {
            title: videoInfo.title,
            description: videoInfo.description,
            tags: videoInfo.tags || [],
            duration: videoInfo.duration,
        };
    } catch (error) {
        console.error('yt-dlp 에러:', error.message);
        throw error;
    }
}

module.exports = { getVideoInfo }; 