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
    ytdl('https://www.youtube.com/watch?v=UnIhRpIT7nc')
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
    'fps=60,format=gray,scale=384:216',
    '-frames',
    '300', 
    'pipe:1'
  ]);

  // Pipe data to p2p
  return fpeg.stdout.pipe(p2p);
}


// Main function
(async () => {
  
  // Download video
  await downloadLagtrainVideo();

  // Benchmarking
  let frameAverage = 0;
  let frameCount = 0;

  // Hodl previous frame for ( hopefully ) optimized rendering
  let previousFrame = [];

  // Clear console before render
  console.clear()

  // Executes on each frame
  getFrames().on('pam', (data) => {
    // Benchmarking
    const startTime = Date.now();
    frameCount++;

    const characters = ['  ', '░░', '▒▒', '▓▓', '██']

    // Scale grey value ( easier to convert )
    const scaledValues = Array.from(data.pixels).map(p => Math.round(interpolateRgb(p, characters.length-1)));

    const height = data.height;
    const width = data.width;
    let outputString = "";

    // Append string for each pixel
    for (i = 0; i < scaledValues.length; i++) {

      // Skip if pixelValue is the same
      if (previousFrame[i] == scaledValues[i]) continue;

      const x = i % width;
      const y = (i - x) / width;
      const pixelValue = scaledValues[i];
      const newCharacter = characters[pixelValue];

      outputString += '\033[' + `${y};${x*2}H${newCharacter}`;
    }

    // Render to terminal
    process.stdout.write(outputString);

    // Write current frame to previousFrame var
    previousFrame = scaledValues;

    // Benchmarking
    frameAverage+= Date.now() - startTime;
  });

  getFrames().on('finish', () => {
    console.clear()
    console.log(`Average frame render time: ${frameAverage/frameCount}ms`); 
    console.log(`Average FPS: ${1000/(frameAverage/frameCount)}`); 
  })

})();

