export interface Part {
  size: number;
  chunk: Blob;
  filename?: string;
  chunk_name?: string;
  percent?: number;
  loaded: number;
  xhr?: XMLHttpRequest
}

export enum UploadStatus {
  INIT,//初始态
  PAUSE,//暂停中
  UPLOADING,
}

export interface Uploaded {
  filename: string,
  size: number;
}
