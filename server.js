var express = require("express");
var router = express.Router();
var app = express();
var bodyParser = require('body-parser');

var bcrypt = require('bcrypt');
const redis = require('redis')
const redisClient = require( "./Redis")
const jwtUtil = require('./utils/Jwt')
const authJWT = require('./middleware/authJWT');
const refresh = require('./refresh');
const jwt = require("jsonwebtoken");
const myInfo = require('./utils/User')

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
    const profileImagePath = req.image
    
    try {
        //이메일 중복 체크
        const emailCheck = await prisma.users.findUnique({ //이메일로 정보 불러옴
            where: {
                email: email,
            }
        });
        if (emailCheck != null) { // 가입된 이메일일 경우에
            return res.status(400).send({error: 'Already used email.'});
        }

        //비밀번호 암호화
        const hPassword = await bcrypt.hash(password, 10)

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
                profileImagePath: profileImagePath,
                talent: talent
            }
        })
        //클라이언트에게 JWT 토큰 전송
        return res.send({
            data:user,
            "success": "user registered sucessfully"
        })
    } catch(err) {
        console.error(err);
        return res.status(500).send({error: 'Server Error.'});
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
                    "success": "Email and password does not match"
                })
            } else { //로그인 성공
                responseContent = { 
                    "code": 200,
                    "success": "login sucessfull",
                }
                // access token과 refresh token을 발급
                const payload = userCheck.email
                const accesstoken = jwtUtil.sign(payload); 
                console.log(accesstoken)
                console.log("-------------")
                const refreshtoken = jwtUtil.refresh();
                console.log(refreshtoken)
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
                    data:responseContent,
                })
            }
        }
    }
    catch { //where 이메일로 찾아오는데 오류나면 이메일이 없는 거임
        return res.send({
            "code":204,
            "success": "Email does not exists"
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
    const type = req.body.type;
    const level = req.body.level;
    const date = req.body.date;
    try {
        if (date!="") //일차 전체 단어 가져오기
        {
            const wordList = await prisma.Words.findMany({
                select: {
                    wordId: true,
                    words: true, // 얘만 가져오면 됨
                    wordType: true,
                    wordLevel: true,
                    wordDate: true,
                },
                where: {wordDate:{equals: parseInt(date)}}
            });
            res.send(wordList)
        }
        else if(level!="" & type!=""){ // 단어 타입과 난이도를 입력했을 때
            const wordList = await prisma.Words.findMany({
                select: {
                    wordId: true,
                    words: true, // 얘만 가져오면 됨
                    wordType: true,
                    wordLevel: true,
                    wordDate: true,
                },
                where: {
                    AND:[
                        {wordType:{in: type}},
                        {wordLevel:{in: level}},
                    ]}
            });
            res.send(wordList)
        }
        else { //전체 단어 불러오기(아무 값도 입력 x)
            const wordList = await prisma.Words.findMany({
                select: {
                    wordId: true,
                    words: true, // 얘만 가져오면 됨
                    wordType: true,
                    wordLevel: true,
                    wordDate: true,
                }
            });
            res.send(wordList)
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({error: 'Server Error.'});
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
            where:{email: email, studyDate: {not: null}}
        });
        res.send(mdate)

    } catch (error) {
        console.error(error);
        res.status(500).send({error: 'Server Error.'});
    }
})


//사용자가 학습 중인 일차를 수정하는 API 
router.put('/mDate',authJWT, async(req, res) => {

    //JWT 토큰에서 사용자 정보 추출 
    const token = req.headers.authorization.split(' ')[1];
    const decoded =  jwtUtil.verify(token); // Access Token의 검증
    const email = decoded.email; // Access Token의 Payload에서 이메일 추출

    const num = req.body.num;
    const usernum = await prisma.MyWords.findFirst({
        select:{mWordId:true},
        where:{email: email,studyDate: {not: null}}
    })
    try {
        const mdate = await prisma.MyWords.update({
            //사용자가 몇일차를 공부하고 있는지 가져오기
            where:{mWordId: usernum.mWordId},
            data:{
                studyDate: num,
            },
        });
        res.send(mdate)

    } catch (error) {
        console.error(error);
        res.status(500).send({error: 'Server Error.'});
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
        res.send(mWord)    
    }
    catch(err) {
      console.error(err);
      res.status(500).send({error: 'Server Error.'});
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
        const wordId = req.body.wordId;
        const word = await prisma.MyWords.findFirst({ // 단어 저장
            where: {wordId : wordId},
            select: { mWordId: true, words: true, email: true }
        });

        //console.log(word)
        //console.log(word.email)
        if (word.email == email){//사용자가 저장한 단어인지 확인
            await prisma.MyWords.delete({
                where: {
                    mWordId: word.mWordId
                },
            });
            res.send("삭제되었습니다");
        }
    }
    catch(err) {
      console.error(err);
      res.status(500).send({error: 'Server Error.'});
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
        res.send(wordList);
    }
    catch(err) {
      console.error(err);
      res.status(500).send({error: 'Server Error.'});
    }
})

//---------------------------------------------------------------
// 마이페이지 -O
router.get('/my',authJWT, async(req, res) =>{
    
    const token = req.headers.authorization.split(' ')[1];
    console.log("server.my");
    console.log(token);

    const decoded = jwtUtil.verify(token)
    console.log(decoded)

    const email = decoded.email; // Access Token의 Payload에서 이메일 추출
    console.log(email)
    try {
        const user = await prisma.users.findUnique({where :{email:email}});
        console.log(user)
        res.send(user);

    } catch (error) {
        res.status(401).json({ message: 'Invalid Access Token' });
    }

});


//------------------------------------------
// route to handle user registration
app.use('/register', router);
app.use('/login', router);
app.use('/api', router);
app.use('/word', router);
app.use('//mDate',router);
app.use('/myWord',router);
app.use('/refresh',router)
//* access token을 재발급 하기 위한 router.


const PORT = 5000;
app.listen(PORT, ()=> {
    console.log(`Server listening on port ${PORT}`);
});


