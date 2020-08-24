import React, { ChangeEvent, useState, useEffect } from 'react';
import { Input, Row, Col, Button, message, Progress, Table } from 'antd'
import { beforeUpload, createChunks, uploadParts, verifyFileStatus } from './utils'
import { Part, UploadStatus } from './types'

function Upload() {
  const [currentFile, setCurrentFile] = useState<File>()
  const [objectUrl, setObjectUrl] = useState<string>('');
  const [hashPercent, setHashPercent] = useState<number>(0);
  const [filename, setFilename] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(UploadStatus.INIT);
  const [partList, setPartList] = useState<Part[]>([]);

  useEffect(() => {
    if(currentFile) {
      let objectUrl = window.URL.createObjectURL(currentFile)
      setObjectUrl(objectUrl);
      // 组件销毁时回收占用资源
      return () => window.URL.revokeObjectURL(objectUrl);
    }
  },[currentFile])

  const reset = () => {
    setUploadStatus(UploadStatus.INIT);
    setObjectUrl('')
    setCurrentFile(undefined)
    setHashPercent(0);
    setPartList([]);
  }
  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    let file:File = event.target.files![0]
    setCurrentFile(file);
  }
  const calculateHash = (partList: Part[]):Promise<string> => {
    return new Promise((resolve, reject) => {
      let worker = new Worker("/hash.js");
      worker.postMessage({ partList });
      worker.postMessage({ partList });
      worker.onmessage = (event) => {
        const { percent, hash } = event.data;
        setHashPercent(percent);
        hash && resolve(hash)
      };
    })
  }

  const verifyFile = async (filename: string) => {
    const { needUpload, uploadedList } = await verifyFileStatus(filename) as any;
    if (!needUpload) { 
      message.success("文件已存在，无需再次上传");
      reset()
      return;
    }
    return uploadedList
  }

  const handleUpload = async () => {
    if (!currentFile) return message.error('你尚未选择文件');
    if (!beforeUpload(currentFile)) return;
    setUploadStatus(UploadStatus.UPLOADING);
    // 分片
    let partList:Part[] = createChunks(currentFile)
    // 根据文件内容计算hash值
    let fileHash: string = await calculateHash(partList);
    console.log(fileHash)
    let extName = currentFile.name.slice(currentFile.name.lastIndexOf('.'));
    let filename = `${fileHash}${extName}`
    partList = partList.map((part, index: number) => ({
      filename,
      chunk_name: `${filename}-${index}`,//分块的名称
      chunk: part.chunk,//代码块
      size: part.chunk.size,
      percent: 0,
      loaded: 0,
    }));
    setFilename(filename);
    setPartList(partList);
    const uploadedList = await verifyFile(filename)
    uploadedList && await uploadParts(partList, filename, uploadedList);
    reset();
  }


  const handlePause = () => {
    partList.forEach((part: Part) => part.xhr && part.xhr.abort());
    setUploadStatus(UploadStatus.PAUSE);
  }

  const handleResume = async () => {
    setUploadStatus(UploadStatus.UPLOADING);
    const uploadedList = await verifyFile(filename)
    await uploadParts(partList, filename, uploadedList);
  }

  const columns = [
    {
        title: '切片名称',
        dataIndex: 'filename',
        key: 'filename',
        width: '20%'
    },
    {
        title: '切片进度',
        dataIndex: 'percent',
        key: 'percent',
        width: '80%',
        render: (value: number) => {
            return <Progress percent={value} />
        }
    },
  ];
  let totalPercent = partList.length > 0 ? Math.round(partList.reduce((acc, curr) => acc + curr.percent!, 0) / (partList.length * 100) * 100) : 0;
  let uploadProgress = uploadStatus !== UploadStatus.INIT ? (
    <>
      <Row>
        <Col span={4}>
            哈希计算:
        </Col>
        <Col span={20}>
            <Progress percent={hashPercent} />
        </Col>
      </Row>
      <Row>
        <Col span={4}>
            总体进度:
        </Col>
        <Col span={20}>
            <Progress percent={totalPercent} />
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={partList}
        rowKey={(row: Part) => row.chunk_name!}
      />
    </>
  ) : null;
  return (
    <div className='upload'>
      <Row>
        <Col span={12}>
          <Input type="file" style={{ width: 300 }} onChange={handleChange} />
          {uploadStatus === UploadStatus.INIT && <Button style={{ marginLeft: 10 }} type="primary" onClick={handleUpload}>上传</Button>}
          {uploadStatus === UploadStatus.UPLOADING && <Button style={{ marginLeft: 10 }} type="primary" onClick={handlePause}>暂停</Button>}
          {uploadStatus === UploadStatus.PAUSE && <Button style={{ marginLeft: 10 }} type="primary" onClick={handleResume}>恢复</Button>}
        </Col>
        <Col span={12}>
          {objectUrl && <img style={{ maxWidth: 300, maxHeight: 300 }} src={objectUrl} alt='' />}
        </Col>
      </Row>
      {uploadProgress}
    </div>
  )
}
export default Upload;
