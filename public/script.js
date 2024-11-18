document.addEventListener('DOMContentLoaded', () => {
    const videoUrlInput = document.getElementById('videoUrl');
    videoUrlInput.value = '';
    const convertBtn = document.getElementById('convertBtn');
    const status = document.getElementById('status');
    const resultText = document.getElementById('resultText');

    convertBtn.addEventListener('click', async () => {
        const videoUrl = videoUrlInput.value.trim();
        
        if (!videoUrl) {
            alert('YouTube URL을 입력해주세요.');
            return;
        }

        try {
            status.textContent = '처리 중...';
            status.style.display = 'block';
            convertBtn.disabled = true;
            resultText.textContent = '';

            const response = await fetch('http://localhost:3000/api/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ videoUrl })
            });

            const data = await response.json();
            console.log('서버 응답:', data);

            if (data.success) {
                resultText.innerHTML = `
                    <div class="meta-info">
                        <div class="meta-row"><strong>제목:</strong> ${data.metadata.title || '정보 없음'}</div>
                        <div class="meta-row"><strong>업로드:</strong> ${formatDate(data.metadata.uploadDate) || '정보 없음'}</div>
                        <div class="meta-row"><strong>채널:</strong> ${data.metadata.channel || '정보 없음'}</div>
                        <div class="meta-row"><strong>태그:</strong> ${data.metadata.tags ? formatTags(data.metadata.tags) : '없음'}</div>
                        <div class="meta-row"><strong>설명:</strong> ${data.metadata.description || '설명 없음'}</div>
                    </div>
                    <div class="summary">
                        <h3>내용 요약</h3>
                        ${data.summary}
                    </div>
                    <div class="transcript-container">
                        <div class="transcript first">
                            <h3>1차 전사 결과</h3>
                            ${data.firstTranscript}
                        </div>
                        <div class="transcript second">
                            <h3>2차 전사 결과</h3>
                            ${data.secondTranscript}
                        </div>
                    </div>
                `.trim();
            } else {
                throw new Error(data.error || '변환 실패');
            }

        } catch (error) {
            console.error('에러 발생:', error);
            resultText.textContent = error.message;
        } finally {
            status.style.display = 'none';
            convertBtn.disabled = false;
        }
    });
});

function formatDate(dateStr) {
    if (!dateStr) return null;
    return `${dateStr.slice(0,4)}년 ${dateStr.slice(4,6)}월 ${dateStr.slice(6,8)}일`;
}

function formatTags(tags) {
    if (!tags || tags.length === 0) return '없음';
    return tags.map(tag => `#${tag}`).join(' ');
} 