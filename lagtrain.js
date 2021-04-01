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
    '200', 
    'pipe:1'
  ]);

  // Pipe data to p2p
  return fpeg.stdout.pipe(p2p);
}

// Compress row data
Object.defineProperty(Array.prototype, 'compress', {
  value: function () {
      let chunk = [];
      let count = 1;

      for (let i = 0; i <= this.length; i++) {
        if (this[i] === this[i+1]) {
          count += 1;
        } else {
          chunk.push({value: this[i], count: count});
          count = 1;
        }
      }
      return chunk;
  }
});


// Split pixel buffer into chunks of rows
Object.defineProperty(Array.prototype, 'chunk', {
  value: function (size) {
    const chunks = [];
    for (var p = 0; p < this.length; p += size) {
      chunks.push(this.slice(p, p + size));
    }
    return chunks;
  }
});


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
    const colors = ['\033[91m', '\033[92m', '\033[93m', '\033[94m', '\033[95m', '\033[96m']
    let colorIndex = 0;

    // Scale grey value ( easier to convert )
    const scaledValues = Array.from(data.pixels).map(p => Math.round(interpolateRgb(p, characters.length-1)));
    const compressedValues = scaledValues.chunk(384).map(e => e.compress());

    const height = data.height;
    const width = data.width;
    let outputString = "";

    // // Append string for each pixel
    let y = 0;
    compressedValues.forEach(row => {
      let x = 0;
      // Render row
      row.forEach(chunk => {
        const newCharacter = characters[chunk.value];
        // outputString += colors[colorIndex++ % colors.length]
        outputString += '\033[' + `${y};${x*2}H${newCharacter.repeat(chunk.count)}`;
        x+=chunk.count;
      })

      y++;
    })


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

