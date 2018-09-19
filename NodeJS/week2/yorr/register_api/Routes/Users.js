var express = require('express');
var users = express.Router();
var cors = require('cors')
var jwt = require('jsonwebtoken');
var token;

var mysql = require('mysql');

var Pool = mysql.createPool({
    connectionLimit: 100,
    host:'localhost',
    user:'root',
    password:'',
    database:'test',
    debug: false,
    multipleStatements: true
});

users.use(cors());

process.env.SECRET_KEY = "test";

// register handler
users.post('/register', function(req, res) {

    var appData = {
        "error": 1,
        "data": ""
    };
    var userData = {
        "email": req.body.email, //body-parser로 get 요청도 받으려면 || req.query.email
        "password": req.body.password,
    }

    Pool.getConnection(function(err, connection) {
        if (err) {
            appData["error"] = 1;
            appData["data"] = "Server Error";
            res.status(500).json(appData); //내부 서버 에러
        } else {
            connection.query('INSERT INTO users SET ?', userData, function(err, rows, fields) {
                if (!err) {
                    appData.error = 0;
                    appData["data"] = "회원가입 성공";
                    res.status(201).json(appData); //리소스 생성
                } else {
                    appData["data"] = "Error";
                    res.status(400).json(appData); //잘못된 요청
                }
            });
            connection.release(); // Pool 이후에 release 꼭 해주기
        }
    });
});

/*
이메일 중복 검사 실패
DB에서 Unique값은 줘서 중복 등록은 안되지만 Postman에 출력을 하지 못함.

users.post('/register', function(req, res) {

    var today = new Date();
    var appData = {
        "error": 1,
        "data": ""
    };

    var userData = {
        "email": req.body.email,
        "password": req.body.password,
    }

    var email = req.body.email;
    var password = req.body.password;

    database.connection.getConnection(function(err, connection) {

        if (err) {
            appData["error"] = 1;
            appData["data"] = "Server Error";
            res.status(500).json(appData);
        } else {
            connection.query('SELECT * FROM users WHERE email = ?', [email], function(err, rows, fields) {
                if (err) {
                    appData.error = 1;
                    appData["data"] = "Error";
                    res.status(400).json(appData);
                } else {
                    if (rows.length > 0 ) {
                        if (rows[0].email == email) {
                            appData.error = 1;
                            appData["data"] = "이메일 중복!";
                            res.status(204).json(appData);
                        } else {
                            connection.query('INSERT INTO users SET ?', userData, function(err, rows, fields) {
                                if (!err) {
                                    appData.error = 0;
                                    appData["data"] = "회원가입 성공";
                                    res.status(201).json(appData);
                                } else {
                                    appData["data"] = "Error!";
                                    res.status(400).json(appData);
                                }
                            });
                            connection.release();
                        }
                    }
                }
            });
        }
    });
});
*/

// login handler
users.post('/login', function(req, res) {

    var appData = {};
    var email = req.body.email;
    var password = req.body.password;

    Pool.getConnection(function(err, connection) {
        if (err) {
            appData["error"] = 1;
            appData["data"] = "Server Error";
            res.status(500).json(appData);
        } else { // ?에 email
            connection.query('SELECT * FROM users WHERE email = ?', [email], function(err, rows, fields) {
                if (err) {
                    appData.error = 1;
                    appData["data"] = "Error Occured!";
                    res.status(400).json(appData);
                } else {
                    if (rows.length > 0) { //mysql은 document가 아닌 rows
                        if (rows[0].password == password) {
                            let token = jwt.sign(rows[0], process.env.SECRET_KEY, {
                                expiresIn: 1440 // 토큰 만료
                            });
                            appData.error = 0;
                            appData["token"] = token;
                            res.status(200).json(appData);
                        } else {
                            appData.error = 1;
                            appData["data"] = "비밀번호가 틀렸습니다.";
                            res.status(204).json(appData); // 잘못된 요청
                        }
                    } else {
                        appData.error = 1;
                        appData["data"] = "이메일이 존재하지 않습니다.";
                        res.status(204).json(appData); // 잘못된 요청
                    }
                }
            });
            connection.release();
        }
    });
});

// 토큰인증 middleware
users.use(function(req, res, next) {
    var token = req.body.token || req.headers['token']; // req.query.token 생략
    var appData = {};
    if (token) {
        jwt.verify(token, process.env.SECRET_KEY, function(err) {
            if (err) {
                appData["error"] = 1;
                appData["data"] = "유효하지 않은 토큰입니다.";
                res.status(500).json(appData);
            } else {
                next();
            }
        });
    } else {
        appData["error"] = 1;
        appData["data"] = "토큰을 전달해주세요.";
        res.status(403).json(appData);
    }
});

// 로그인 후 생성된 토큰
users.get('/getUsers', function(req, res) {

    var appData = {};

    Pool.getConnection(function(err, connection) {
        if (err) {
            appData["error"] = 1;
            appData["data"] = "Server Error";
            res.status(500).json(appData);
        } else {
            connection.query('SELECT *FROM users', function(err, rows, fields) {
                if (!err) {
                    appData["error"] = 0;
                    appData["data"] = rows;
                    res.status(200).json(appData);
                } else {
                    appData["data"] = "데이터 없음.";
                    res.status(204).json(appData);
                }
            });
            connection.release();
        }
    });
});

module.exports = users;