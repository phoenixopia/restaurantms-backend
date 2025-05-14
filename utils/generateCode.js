const jwt = require('jsonwebtoken');


const generateCode = () => {
    const characters = '0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
};

function generateToken() {
    return jwt.sign({}, process.env.JWT_SECRET, { expiresIn: '4hr' });
}


module.exports = { generateCode, generateToken };