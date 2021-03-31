#!/usr/bin/env node

const fs = require('fs');
const ytdl = require('ytdl-core');

// Download Lagtrain video from youtube
const downloadLagtrainVideo = () => {
  return new Promise(resolve => {
    ytdl('https://www.youtube.com/watch?v=UnIhRpIT7nc&ab_channel=%E7%A8%B2%E8%91%89%E6%9B%87')
      .pipe(fs.createWriteStream('lagtrain.mp4'))
      .on('close', () => {
          resolve();
      })
  })
}


downloadLagtrainVideo();