#!/usr/bin/env node

const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const P2P = require('pipe2pam');
const { Console } = require('console');


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


// Convert range from 0-255 to be match character color
const interpolateRgb = (value, max) => {
  const scaled = value / 255;
  return scaled * max;
}


// On data recieve, parse it, and load frame into memory ( faster alternative to saving each frame as an image )
const getFrames = () => {
  
  // Initialise p2p
  const p2p = new P2P();

  // Get each frame in video using ffmpeg and convert to greyscale
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
    '-vf',
    'fps=60,format=gray,scale=640:360',
    '-frames',
    '1000', 
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

    const characters = ['  ', '░░', '▒▒', '▓▓', '██']

    // Scale grey value ( easier to convert )
    const scaledValues = Array.from(data.pixels).map(p => Math.round(interpolateRgb(p, characters.length)));

    const height = data.height;
    const width = data.width;
    let outputString = "";

    // Height
    for (y = 0; y < height; y++) {
      
      // Width
      for (x = 0; x < width; x++) {
          const p = y * width + x;
          const pixelValue = scaledValues[p];
          const newCharacter = characters[pixelValue];

          // Add character to outputString
          outputString += newCharacter;
      }
      
      // Add newline
      outputString += '\n';
    }

    console.clear()
    console.log(outputString);
  });
})();

