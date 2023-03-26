const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function UserEmailCheck(email){    
    //이메일 중복 체크
    const emailCheck = await prisma.users.findFirst({ //이메일로 정보 불러옴
        where: {
            email: email,
        }
    });
    if (emailCheck != null) { // 가입된 이메일일 경우에
        return false;
    }
    else {
        return true;
    }
};

module.exports = {UserEmailCheck};
