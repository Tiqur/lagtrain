#!/usr/bin/env node

const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const P2P = require('pipe2pam');
const jpeg = require('jpeg-js');


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


// On data recieve, parse it, and load frame into memory ( faster alternative to saving each frame as an image )
const getFrames = () => {
  
  // Initialise p2p
  const p2p = new P2P();

  // Get each frame in video using ffmpeg
  const fpeg = spawn(ffmpegPath, [    
    '-loglevel',
    'quiet',
    '-re',
    '-i',
    `${__dirname}\\lagtrain.mp4`,
    '-an',
    '-c:v',
    'pam',
    '-f',
    'image2pipe',
    '-pix_fmt',
    'rgba',
    '-vf',
    'fps=60,scale=iw:ih',
    '-frames',
    '10', 
    'pipe:1'
  ]);

  // Pipe data to p2p
  return fpeg.stdout.pipe(p2p);
}


// Main function
(async () => {
  // Download video
  await downloadLagtrainVideo();


  // Executes on each frame
  getFrames().on('pam', (data) => {
    const rawImageData = {
        data: data.pixels,
        width: data.width,
        height: data.height
    };

    // fs.writeFileSync('image.jpg', jpeg.encode(rawImageData, 50).data)
    console.log(jpeg.encode(rawImageData, 50).data);
  });
})();

