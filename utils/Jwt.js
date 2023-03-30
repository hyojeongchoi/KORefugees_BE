const { promisify } = require('util');
const redis = require('redis')
const jwt = require('jsonwebtoken');
const redisClient = require( "../Redis")


const jwtUtil = {
  sign: (email) => { // access token 발급
    const payload = { // access token에 들어갈 payload
      email: email
    };
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { // secret으로 sign하여 발급하고 return
      expiresIn: '1h', 	  // 유효기간
    });
  },
  verify: (token) => { // access token 검증
    let decoded = null;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      console.log("Jwt.js")
      //console.log(decoded)
      //console.log(decoded.email)
      //console.log(decoded.payload.email) -> payload로 감싸져오더니 갑자기 안감싸져서 옴 ㅋㅋ
      //console.log("--------------------")
      return {
        type: true,
        email: decoded.email,
        message:"전달 완료",
        exp: decoded.exp
      };
    } catch (err) {
      //console.log("--------------------")
      return {
        type: false,
        message: err.message,
        message:"jwt expired"
      };
    }
  },
  refresh: () => { // refresh token 발급
    return jwt.sign({}, process.env.ACCESS_TOKEN_SECRET, { // refresh token은 payload 없이 발급
      expiresIn: '14d',
    });
  },
  refreshVerify: async (token, email) => { // refresh token 검증
    /* redis 모듈은 기본적으로 promise를 반환하지 않으므로,
       promisify를 이용하여 promise를 반환하게 해줍니다.*/
    const getAsync = promisify(redisClient.get).bind(redisClient);
    
    try {
      const data = await getAsync(email); // refresh token 가져오기
      if (token === data) {
        try {
          jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
          return true;
        } catch (err) {
          return false;
        }
      } else {
        return false;
      }
    } catch (err) {
      return false;
    }
  },
};
module.exports = jwtUtil;