var express = require("express");
var router = express.Router();
var app = express();
var bodyParser = require('body-parser');
app.use( bodyParser.urlencoded({ extended: true }) );
app.use( bodyParser.json() );


//env
const dotenv = require("dotenv");
dotenv.config();

//prisma
const { PrismaClient } = require('@prisma/client');
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
    const age = req.body.age
    const gender = req.body.gender
    const type = req.body.type
    const status =  req.body.status
    const nation = req.body.nation
    const profileImagePath = req.image
    const koreanLevel = req.body.koreanLevel
    const talent = req.body.talent
    
    try {
        const emailCheck = await prisma.users.findFirst({ //이메일로 정보 불러옴
            where: {
                email: email,
            }
        });

        if (emailCheck == null) { // 기존 회원이 아닐때
            user = await prisma.users.create({
                data: {
                    email: email,
                    password: password,
                    name: name,
                    age: age,
                    gender: gender,
                    type: type,
                    status: status,
                    nation: nation,
                    koreanLevel: koreanLevel,
                    profileImagePath: profileImagePath,
                    talent: talent
                }
            })
            res.send({
                data:user,
                "success": "user registered sucessfully"
            })
        }
        else // 가입된 이메일일 경우에
        {
            res.status(403).send({error: 'Already used email.'});
        }
    } catch(err) {
        console.error(err);
        res.status(500).send({error: 'Server Error.'});
        return;
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
        if(userCheck.email==email) { //입력한 이메일이랑 일치하는지
            if(userCheck.password == password) { //비밀번호와도 일치하는지
                responseContent = { // 로그인 성공
                    "code": 200,
                    "success": "login sucessfull"
                }
            } else {
                responseContent = { // 이메일은 맞는데 비밀번호가 틀렸을 경우
                    "code": 204,
                    "success": "Email and password does not match"
                }
            }
        }
    }
    catch { //where 이메일로 찾아오는데 오류나면 이메일이 없는 거임
        responseContent = {
            "code":204,
            "success": "Email does not exists"
        }
    }       
    res.send({
        data:responseContent
    })
});



//------------------------------------------
// route to handle user registration
app.use('/register', router);
app.use('/login', router)
app.use('/api', router);
const PORT = 5000;
app.listen(PORT, ()=> {
    console.log(`Server listening on port ${PORT}`);
});


