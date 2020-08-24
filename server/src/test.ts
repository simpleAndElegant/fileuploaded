const fs = require('fs-extra')
const path = require('path')
const PUBLIC_DIR = path.resolve(__dirname, '../public')
const filePath = path.resolve(PUBLIC_DIR, '/Users/liangrui/Desktop/upload2/server/public/1');
const test = async () => {
  let existFile = await fs.pathExists(filePath);
  console.log(existFile)
}

test()

