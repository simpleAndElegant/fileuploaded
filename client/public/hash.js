/* eslint-disable no-restricted-globals */
self.importScripts('https://cdn.bootcss.com/spark-md5/3.0.0/spark-md5.js');
self.onmessage = async (event) =>{
  let { partList } = event.data;
  const spark = new self.SparkMD5.ArrayBuffer();
  let percent = 0; // 解析整体文件的hash值的进度
  let perSize = 100 / partList.length; // 解析分片文件的hash值的进度
  let buffers = await Promise.all(partList.map(({ chunk }) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(chunk);
    reader.onload = (event) => {
      percent += perSize;
      self.postMessage({ percent: Number(percent.toFixed(2)) });
      resolve(event.target.result);
    }
  })));
  buffers.forEach(buffer => spark.append(buffer));
  // 通知主进程 
  self.postMessage({ percent: 100, hash: spark.end() });
  self.close();
}