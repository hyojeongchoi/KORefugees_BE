const { verify } = require('../utils/Jwt');
const myInfo = require('../utils/User');
//유효성 검증?
const authJWT = (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split('Bearer ') [1]; // header에서 access token을 가져옴
    const result = verify(token); // token을 검증합니다.
    console.log("authJWT.js")
    //console.log(token)
    //console.log(result)
    //console.log(result.email)
    //console.log("--------------------")
    if (result.type) { // token이 검증되었으면 req에 값을 세팅하고, 다음 콜백함수로 갑니다.
      req.email = result.email;
      next();
    } else { // 검증에 실패하거나 토큰이 만료되었다면 클라이언트에게 메세지를 담아서 응답합니다.
      res.status(401).send({
        type: false,
        message: result.message, // jwt가 만료되었다면 메세지는 'jwt expired'입니다.
      });
    }
  }
};

module.exports = authJWT;