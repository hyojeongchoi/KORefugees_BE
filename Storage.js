// GCP Storage
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket("korefugee_trans"); // dotenv 필요

const { v4: uuidv4 } = require('uuid');


// 이미지 업로드 & URL 반환하는 함수
function uploadImage(req, res, next) {
  // file이 존재해야만 업로드
  console.log("Storage.js")
  if(req.file != undefined){
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = uuidv4(); // uuid4
    req.imgName = fileName;
    req.fileExtension = fileExtension;
    //const filePath = `posts/original/${fileName}.${fileExtension}`;
    const filePath = `original/${fileName}.${fileExtension}`;
    const blob = bucket.file(filePath); 
    const blobStream = blob.createWriteStream({
        resumable: false,
    });
    blobStream.on('error', err => {
        next(err);
    });
    const image = `https://storage.googleapis.com/${bucket.name}/` + filePath;
    req.image = image;

    //next();
    /* --> 이거쓰면 서버코드 실행된 후에야 코드가 진행이 되어서 그냥 밖으로 뺐음 / 이래도 되는지는 잘 모르겠음
    blobStream.on('finish', () => {
        const image = `https://storage.googleapis.com/${bucket.name}/` + filePath;
        req.image = image;
        console.log("6")
        console.log(req.image)
        next();
    });
    */
    blobStream.end(req.file.buffer);
  }
  next();
};

// GCP Storage 파일 삭제하는 함수 -> 삭제 딜레이 2-30분 있는지 확인하기
async function deleteFile(image) {
  if (image != null) {
    const fileNameWithPath = image.split(`https://storage.googleapis.com/${bucket.name}/`)[1];
    await storage.bucket(bucket.name).file(fileNameWithPath).delete();
    console.log(`gs://${bucket.name}/${fileNameWithPath} deleted`);
  }
}

/*
function returnImage(filename) {
  // file이 존재해야만 반환
  if(req.file != undefined){
    const file = req.file.split(`https://storage.googleapis.com/${bucket.name}/`)[1];
    const image = `https://storage.googleapis.com/${bucket.name}/` + filePath;
    req.image = image;

  }
  next();
};
*/
// GCP image upload test API example
// app.post('/upload', multer.single('file'), (req, res, next) => {
//   if (!req.file) {
//     res.status(400).send('No file uploaded.');
//     return;
//   }
//   console.log(req.file)

//   const fileExtension = req.file.originalname.split('.').pop();
//   const fileName = uuidv4(); // uuid4
//   const filePath = `posts/test/${fileName}.${fileExtension}`;
//   const blob = bucket.file(filePath);
//   const blobStream = blob.createWriteStream({
//     resumable: false,
//   });

//   blobStream.on('error', err => {
//     next(err);
//   });

//   blobStream.on('finish', () => {
//     res.status(200).send(`https://storage.googleapis.com/${bucket.name}/` + filePath);
//   });

//   blobStream.end(req.file.buffer);
// });

module.exports = { uploadImage, deleteFile }