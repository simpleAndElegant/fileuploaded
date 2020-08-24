import { message } from 'antd';
import {Part, Uploaded} from './types'
const SIZE = 1024 * 1024 * 10;

const beforeUpload = (file: File) =>{
  console.log(file.type)
  const isValidFileType = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4','video/x-ms-wmv'].includes(file.type);
  if (!isValidFileType) return  message.error('不支持此文件类型!');
  const isLt2G = file.size / 1024 / 1024 < 1024 * 1024 * 1024;
  if (!isLt2G) return  message.error('上传的图片不能大于2MB!');
  return isValidFileType && isLt2G;
}
const request = (options: any) => {
  let _default: any = {
    baseURL: 'http://localhost:8000',
    method: 'GET',
    header: {},
    data: {}
  };
  options = { ..._default, ...options, headers: { ..._default.headers, ...(options.headers || {}) } };
  return new Promise((resolve: Function, reject: Function) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method, options.baseURL + options.url, true);
    Object.entries(options.headers).forEach(([key, value]) => xhr.setRequestHeader(key, value as string));
    xhr.responseType = 'json';
    xhr.upload.onprogress = options.onProgress;
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (/(2|3)\d{2}/.test('' + xhr.status)) {
          resolve(xhr.response);
        } else {
          reject(xhr.response);
        }
      }
    }
    options.setXHR && options.setXHR(xhr);
    xhr.send(options.data);
  });
}

const createChunks = (file:File):Part[] => {
  let current = 0,partList: Part[] = [];
  while(current < file.size) {
    const chunk:Blob = file.slice(current, current + SIZE);
    partList.push({ chunk, size: chunk.size, loaded: 0  });
    current += SIZE;
  }
  return partList
}

const createRequests = (partList: Part[], uploadedList: Uploaded[]) => {
  return partList.filter((part: Part) => {
    let uploadedFile = uploadedList.find(item => item.filename === part.chunk_name);
    if (!uploadedFile) {
      part.loaded = 0;
      part.percent = 0;
      return true
    }
    if (uploadedFile.size < part.chunk.size)  {
      part.loaded = uploadedFile.size;
      part.percent = Number(((part.loaded / part.chunk.size) * 100).toFixed(2));
      return true;
    }
    return false;
  }).map((part: Part) => {
    return request( {
      url: `/upload/${part.filename}/${part.chunk_name!}/${part.loaded!}`,
      method: 'POST',
      header: { 'Content-Type': 'application/octet-stream' },
      data: part.chunk.slice(part.loaded!),
      setXHR: (xhr: XMLHttpRequest) => { part.xhr = xhr },
      onProgress: (event: ProgressEvent) => {
        part.percent = Number((Number(part.loaded + event.loaded) / part.chunk.size * 100).toFixed(2));
      }
    })
  })
}

const uploadParts = async (partList: Part[], filename: string, uploadedList: Uploaded[]) =>{
  let requests = createRequests(partList, uploadedList);
  await Promise.all(requests);
  // 通知后端分片上传完成
  await request({
    url: '/merge',
    method: 'POST',
    headers: { 'Content-Type': "application/json" },
    data: JSON.stringify({ filename })
  });
  message.info('上传成功!');
}

const verifyFileStatus = async (filename: string) => {
  if (!filename) {
    message.error('文件名不能为空');
    return
  }
  const result = await request({
    url: "/verify",
    method: 'POST',
    headers: { "content-type": "application/json" },
    data: JSON.stringify({ filename })
  })
  return result
}

export {
  beforeUpload,
  createChunks,
  uploadParts,
  verifyFileStatus
}
