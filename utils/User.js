const { promisify } = require('util');
const redis = require('redis')
const jwt = require('jsonwebtoken');
const redisClient = require( "../Redis")


const myInfo = async(req, res, next) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split('Bearer ') [1]; // header에서 access token을 가져옴
        const result = verify(token); // token을 검증합니다.
        console.log("Users.js")
        try {
            const user = await prisma.users.findUnique({where :{email:result.email}});
            console.log(user)
            return {
                data: user
            }  

        } catch (error) {
            res.status(401).json({ message: 'Invalid Access Token' });
        }
    }
};

module.exports = myInfo;
//d일단 실패