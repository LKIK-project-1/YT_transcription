const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

async function extractAudio(videoUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const stream = ytdl(videoUrl, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    ffmpeg(stream)
      .toFormat('wav')
      .outputOptions('-acodec pcm_s16le')
      .outputOptions('-ar 16000')
      .outputOptions('-ac 1')
      .save(outputPath)
      .on('end', () => {
        console.log('오디오 추출 완료');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('오디오 추출 실패:', err);
        reject(err);
      });
  });
}

module.exports = { extractAudio }; 