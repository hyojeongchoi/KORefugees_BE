var express = require("express");
var router = express.Router();
var app = express();
var bodyParser = require('body-parser');

//회원가입,로그인
var bcrypt = require('bcrypt');
const redis = require('redis')
const redisClient = require( "./Redis")
const jwtUtil = require('./utils/Jwt')
const authJWT = require('./middleware/authJWT');
const refresh = require('./refresh');

const jwt = require("jsonwebtoken");

//이메일 체크
const UserEmailCheck = require('./utils/EmailCheck')

//파일 업로드
const multer = require('./middleware/Multer');
const { uploadImage, deleteFile } = require('./utils/Storage');

app.use( bodyParser.urlencoded({ extended: true }) );
app.use( bodyParser.json() );


//env
const dotenv = require("dotenv");
dotenv.config();

//prisma
const { PrismaClient } = require('@prisma/client');
//const { Client } = require("socket.io/dist/client");
const prisma = new PrismaClient();

//routes
//ar Auth = require('./routes/Auth');
//app.use("/api",Auth)


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


// test route
router.get('/', function(req, res) {
   res.json({ message: 'welcome to our upload module apis' });
});





//------------------------------------------
// 이메일 중복체크 api
router.post('/emailCheck',async function (req, res,next)  {
    const email = req.body.email    
    const check = await UserEmailCheck.UserEmailCheck(email)
    
    console.log(check)
    if(check)
    {
        return res.send({
            success: "Can use this Email.",
            error:""
        })
    }
    else if(!check){
        return res.send({
            success: "",
            error:"Already used Email."
        })
    }
});

// 회원가입 api
router.post('/register',async function (req, res,next)  {
    let user ={};

    // console.log("req", req.body);
    //var today = new Date();
    const email = req.body.email
    const password = req.body.password
    const name = req.body.name
    const birth = req.body.birth
    const gender = req.body.gender
    const status =  req.body.status
    const nation = req.body.nation
    const language = req.body.language
    
    try { 
        //비밀번호 암호화
        const hPassword = await bcrypt.hash(password, 10)
        const check = await UserEmailCheck.UserEmailCheck(email)
        if(!check) {
            return res.send({
                success: "",
                error:"Already used Email."
            })
        }
        else {
            //사용자 등록
            user = await prisma.users.create({
                data: {
                    email: email,
                    password: hPassword,
                    name: name,
                    birth: birth,
                    gender: gender,
                    status: status,
                    nation: nation,
                    language:language
                }
            })
            await prisma.MyWords.create({
                data:{
                    email:email,
                    studyDate:1
                }
            })
            //클라이언트에게 JWT 토큰 전송
            return res.send({
                success: "user registered sucessfully",
                error:""
            })
        }
    } catch(err) {
        console.error(err);
        return res.status(500).send({error: 'Server Error.', success:""});
    }
});
    

//Login API 
//next 안해주면 이대로 종료가 됨
router.post('/login', async function(req, res, next)  {
    const email = req.body.email;
    //var id = req.body.id;
    const password = req.body.password;
    let responseContent = [];
    try {
        userCheck= await prisma.users.findUnique({ //이메일로 정보 불러옴
            select: {
                email :true,
                password : true
            },
            where: {
                email: email,
            },
        });

        if(userCheck.email == email) { //입력한 이메일이랑 일치하는지
            const passwordValid = await bcrypt.compare(password, userCheck.password)

            if(!passwordValid) { //비밀번호와도 일치하는지
                res.send({
                    "code": 204,
                    success: "Email and password does not match",
                    error:"",
                    token:""
                })
            } else { //로그인 성공
                responseContent = { 
                    "code": 200,
                    success: "login sucessfull",
                    error:"",
                }
                // access token과 refresh token을 발급
                const payload = userCheck.email
                const accesstoken = jwtUtil.sign(payload); 
                //console.log(accesstoken)
                //console.log("-------------")
                const refreshtoken = jwtUtil.refresh();
                //console.log(refreshtoken)
                /*
                const Accesstoken = (jwt.sign({ payload }, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: "15m"}));
                console.log(Accesstoken)
                console.log("---------------")
                const Refreshtoken = (jwt.sign({}, process.env.ACCESS_TOKEN_SECRET, { // refresh token은 payload 없이 발급
                    expiresIn: '14d'}));
                console.log(Refreshtoken);
                */
                
                 // 발급한 refresh token을 redis에 key를 user의 email로 하여 저장
                redisClient.set(payload,refreshtoken);

                res.setHeader('Content-Type','application/json; charset=utf-8');
                res.setHeader('Authorization', 'Bearer ' + accesstoken);
                res.setHeader('Refresh', 'Bearer ' + refreshtoken);

                res.send({
                    token: {
                        accesstoken:accesstoken,
                        refreshtoken:refreshtoken,
                    },
                    responseContent,
                })
            }
        }
    }
    catch { //where 이메일로 찾아오는데 오류나면 이메일이 없는 거임
        return res.send({
            token:{
                accesstoken:"1",
                refreshtoken:"1",
            },
            "code":204,
            success: "Email does not exists",
            error:"",
        })
    }           
});

/* access token을 재발급 하기 위한 router.
  클라이언트는 access token과 refresh token을 둘 다 헤더에 담아서 요청해야합니다. */
router.get('/refresh',refresh);



//---------------------------------------------------------------------
//전체 단어장 API -> 매개변수로 가져오기 
router.get('/word', async(req, res) => {
    //const type = req.query.type; // 매개변수로 입력 (분류, n일차)
    const type = req.query.type;
    const level = req.query.level;
    const date = req.query.date;
    try {
        if (date!=undefined & date != 0) //일차 전체 단어 가져오기
        {
            const wordList = await prisma.Words.findMany({
                select: {
                    wordId: true,
                    words: true, 
                    wordDate: true,
                },
                where: {wordDate:{equals: parseInt(date)}}
            });
            res.send({success:"success", error:"", data: wordList})
        }
        else if(date == 0 & level!=undefined & type!=undefined){ // 단어 타입과 난이도를 입력했을 때
            const wordList = await prisma.Words.findMany({
                select: {
                    wordId: true,
                    words: true, 
                    wordType: true,
                    wordLevel: true,
                },
                where: {
                    AND:[
                        {wordType:{in: type}},
                        {wordLevel:{in: level}},
                    ]}
            });
            res.send({success:"success", error:"", data: wordList})
        }
        else{ //전체 단어 불러오기(아무 값도 입력 x)
            const wordList = await prisma.Words.findMany({
                select: {
                    wordId: true,
                    words: true, // 얘만 가져오면 됨
                }
            });
            res.send({success:"success", error:"", data: wordList})
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({success:"",error: 'Server Error.',data: ""});
    }
});


//사용자가 학습 중인 일차를 불러오는 API
router.get('/mDate',authJWT, async(req, res) => {

    //JWT 토큰에서 사용자 정보 추출 
    const token = req.headers.authorization.split(' ')[1];
    const decoded =  jwtUtil.verify(token); // Access Token의 검증
    const email = decoded.email; // Access Token의 Payload에서 이메일 추출
    //console.log(email)
    try {
        const mdate = await prisma.MyWords.findMany({
            //사용자가 몇일차를 공부하고 있는지 가져오기
            select:{
                studyDate: true,
            },
            where:{ 
                email: email, 
                studyDate: {not: null}, 
                wordId:null,
                words:null
            }
        });
        res.send({success:"success", error:"", data: mdate})

    } catch (error) {
        console.error(error);
        res.status(500).send({success:"", error: 'Server Error.',data: ""});
    }
})



//사용자가 학습 중인 일차를 수정하는 API 
router.put('/mDate',authJWT, async(req, res) => {

    //JWT 토큰에서 사용자 정보 추출 
    const token = req.headers.authorization.split(' ')[1];
    const decoded =  jwtUtil.verify(token); // Access Token의 검증
    const email = decoded.email; // Access Token의 Payload에서 이메일 추출

    const num = parseInt(req.query.num);
    const usernum = await prisma.MyWords.findFirst({
        select:{mWordId:true},
        where:{email: email, studyDate: {not: null}}
    })
    try {
        const mdate = await prisma.MyWords.update({
            //일차 수정
            where:{mWordId: usernum.mWordId},
            data:{
                studyDate: num,
            },
        });
        res.send({success:"success", error:"", data: mdate})

    } catch (error) {
        console.error(error);
        res.status(500).send({success:"", error: 'Server Error.',data: ""});
    }
})

//나만의 단어장에 추가 API 
router.post('/myWord',authJWT ,async(req, res) => {
    try {
        //JWT 토큰에서 사용자 정보 추출 
        const token = req.headers.authorization.split(' ')[1];
        const decoded =  jwtUtil.verify(token); // Access Token의 검증
        const email = decoded.email; // Access Token의 Payload에서 이메일 추출

        //저장할 단어 정보
        const wordId = req.body.wordId;
        const word = await prisma.Words.findUnique({ // 단어 저장
            where: {wordId : wordId},
            select: { wordId: true, words: true }
        });
        const mWord = await prisma.MyWords.create({
            data: {
                email: email,
                wordId: word.wordId,
                words: word.words
            },
        });
        res.send({success:"success", error:"", data: mWord})    
    }
    catch(err) {
      console.error(err);
      res.status(500).send({success:"",error: 'Server Error.',data:""});
    }
});

//나만의 단어장에서 삭제 API
router.delete('/myWord',authJWT, async(req, res) => {
    try {
        //JWT 토큰에서 사용자 정보 추출 
        const token = req.headers.authorization.split(' ')[1];
        const decoded =  jwtUtil.verify(token); // Access Token의 검증
        const email = decoded.email; // Access Token의 Payload에서 이메일 추출

        //삭제할 단어 정보 -> WordId로 
        const wordId = parseInt(req.query.wordId);
        const word = await prisma.MyWords.findFirst({ // 단어 찾기
            where: {wordId : wordId},
            select: { mWordId: true, words: true, email: true }
        });

        //console.log(word)
        //console.log(word.email)
        if(word == null)
        {
            res.send({success:"",error:"없는 단어입니다."});
        }
        else 
        {
            if (word.email == email){//사용자가 저장한 단어인지 확인
                await prisma.MyWords.delete({
                    where: {
                        mWordId: word.mWordId,
    
                    },
                });
                res.send({success:"삭제되었습니다",error:""});
            }
        } 
    }
    catch(err) {
      console.error(err);
      res.status(500).send({success:"",error: 'Server Error.'});
    }
})


//나만의 단어장 가져오기 API
router.get('/myWord',authJWT, async(req, res) => {
    try {
        //JWT 토큰에서 사용자 정보 추출 
        const token = req.headers.authorization.split(' ')[1];
        const decoded =  jwtUtil.verify(token); // Access Token의 검증
        const email = decoded.email; // Access Token의 Payload에서 이메일 추출

        const wordList = await prisma.MyWords.findMany({
            select:{
                wordId: true,
                words: true
            },
            where: {
                email: email,
                wordId: {not: null},
                words: {not: null}
            }
        });
        res.send({success:"success",error:"", data: wordList});
    }
    catch(err) {
      console.error(err);
      res.status(500).send({success:"",error: 'Server Error.',data: ""});
    }
})

//---------------------------------------------------------------
// 마이페이지 -O
router.get('/my',authJWT, async(req, res) =>{
    
    //const token = req.headers.authorization.split(' ')[1];
    //const decoded = jwtUtil.verify(token)
    //const email = decoded.email; // Access Token의 Payload에서 이메일 추출
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwtUtil.verify(token)
        const email = decoded.email; 
        const user = await prisma.users.findUnique({where :{email:email}});
        console.log(user)
        res.send({success:"success",error:"",data: user});

    } catch (error) {
        res.status(500).json({ success:"",error: 'Server Error',data:"{1}" });
    }

});

//------------------------------------------

//위치 API -> 전체 장소들 가져오기
router.get('/place', async(req, res) => {
    try {
        const placeList = await prisma.Map.findMany({
            select: {
                placeId: true,
                place: true, // 얘만 가져오면 됨
                pNum: true,
                pSite: true,
            }
        });
        res.send(placeList)
    } catch (error) {
        console.error(error);
        res.status(500).send({error: 'Server Error.'});
    }
});

//내 장소에 추가하기
router.post('/myPlace',authJWT ,async(req, res) => {
    try {
        //JWT 토큰에서 사용자 정보 추출 
        const token = req.headers.authorization.split(' ')[1];
        const decoded =  jwtUtil.verify(token); // Access Token의 검증
        const email = decoded.email; // Access Token의 Payload에서 이메일 추출

        //저장할 장소 정보
        const placeId = req.body.placeId;
        const place = await prisma.Map.findUnique({ // 장소 저장
            where: {placeId : placeId},
            select: { placeId: true, place: true, pNum:true, pSite: true }
        });
        const mPlace = await prisma.MyMap.create({
            data: {
                email: email,
                placeId: place.placeId, 
                place: place.place, 
                pNum: place.pNum, 
                pSite: place.pSite
            },
        });
        res.send({success:"success",error:""})    
    }
    catch(err) {
      console.error(err);
      res.status(500).send({success:"",error: 'Server Error.'});
    }
});

//나의 장소에서 삭제 API
router.delete('/myPlace',authJWT, async(req, res) => {
    try {
        //JWT 토큰에서 사용자 정보 추출 
        const token = req.headers.authorization.split(' ')[1];
        const decoded =  jwtUtil.verify(token); // Access Token의 검증
        const email = decoded.email; // Access Token의 Payload에서 이메일 추출

        //삭제할 장소 정보 -> placeId로 
        const placeId = req.query.placeId;
        const place = await prisma.MyMap.findFirst({ // 장소 찾기
            where: {placeId : placeId},
            select: { mPlaceId: true, email: true }
        });
        if(place == null)
        {
            res.send({success:"",error:"없는 단어입니다."});
        }
        else 
        {
            if (place.email == email){//사용자가 저장한 단어인지 확인
                await prisma.MyMap.delete({
                    where: {
                        mPlaceId: place.mPlaceId
                    },
                });
                res.send({success:"삭제되었습니다",error: ''});
            }
        }
    }
    catch(err) {
      console.error(err);
      res.status(500).send({success:"",error: 'Server Error.'});
    }
})


//내장소 가져오기 API
router.get('/myPlace',authJWT, async(req, res) => {
    try {
        //JWT 토큰에서 사용자 정보 추출 
        const token = req.headers.authorization.split(' ')[1];
        const decoded =  jwtUtil.verify(token); // Access Token의 검증
        const email = decoded.email; // Access Token의 Payload에서 이메일 추출

        const pList = await prisma.MyMap.findMany({
            where: {
                email: email
            }
        });
        res.send(pList);
    }
    catch(err) {
      console.error(err);
      res.status(500).send({error: 'Server Error.'});
    }
})




//------------------------------------------
//이미지 gcp에 업로드 api
router.post('/image', authJWT, multer.single('file'), uploadImage, async (req, res) => {
    try {
        const json = JSON.parse(req.body.json);
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwtUtil.verify(token); // Access Token의 검증
        const email = decoded.email; // Access Token의 Payload에서 이메일 추출

        const image = req.image
        //const imgName = json.imgName;
        const imgName = req.imgName;
        const transLan = json.transLan;
        const fileExtension = req.fileExtension;
        const imgUpload = await prisma.Image.create({
            data:{
                email:email,
                imgName: imgName,
                transLan: transLan,
                imgPath: image,
                fileExtension: fileExtension
            }
        })
        res.send(imgUpload)
    } catch (err) {
        console.error(err);
        res.status(500).send({success:"",error: 'Server Error.'}); 
    }
});



// route to handle user registration 
app.use('/register', router);
app.use('/login', router);
app.use('/api', router);
app.use('/word', router);
app.use('/mDate',router);
app.use('/myWord',router);
app.use('/place',router);
app.use('/myPlace',router);
app.use('/refresh',router)
app.use('/image',router)

//* access token을 재발급 하기 위한 router.


const PORT = 5000;
app.listen(PORT, ()=> {
    console.log(`Server listening on port ${PORT}`);
});


