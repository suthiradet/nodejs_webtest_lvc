
const express = require('express');
const session = require('express-session');
const db = require('./db');

const app = express();
const PORT = 3000;

// ตั้งค่า EJS
app.set('view engine', 'ejs');

// อ่านข้อมูลจาก Form
app.use(express.urlencoded({ extended: true }));

// ตั้งค่า Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}));

// เปิดให้เข้าถึงไฟล์ใน public
app.use(express.static('public'));

// Middleware ตรวจสอบการ Login
function requireLogin(req, res, next) {
    if (!req.session.account) {
        return res.redirect('/');
    }

    next();
}
app.get('/', async (req, res) => {
    try {
        const [account] = await db.query(`SELECT * FROM account`);


        res.render('login', { account });
    } catch (error) {
        res.status(404).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
    }

    
});

app.post('/login', async (req, res) => {
    const { username_acc, password_acc } = req.body;

    try {
        const [account] = await db.query(
            `SELECT * FROM account
             WHERE username_acc = ? AND password_acc = ?`,
            [username_acc, password_acc]
        );

        if (account.length > 0) {

            // สร้าง Session ใหม่หลังจาก Login สำเร็จ
            req.session.regenerate((error) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
                }

                req.session.account = account[0];

                // บันทึก Session ก่อนเปลี่ยนหน้า
                req.session.save((error) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).send('ไม่สามารถบันทึก Session ได้');
                    }

                    res.redirect('/home');
                });
            });

        } else {
            res.status(401).render('login', {
    error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
});
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('เกิดข้อผิดพลาดในการตรวจสอบข้อมูลเข้าสู่ระบบ');
    }
});

// หน้าหลัก แสดงรายชื่อนักศึกษา
app.get('/home', requireLogin, async (req, res) => {
    try {
       
        const [student] = await db.query(`
            SELECT
                s.*,
                c.name_class,
                d.name_dept
            FROM student AS s
            LEFT JOIN class AS c
                ON s.id_class = c.id_class
            LEFT JOIN department AS d
                ON s.id_dept = d.id_dept
        `);

        res.render('home', { student });
    } catch (error) {
        console.error(error);
        res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
    }
});

// หน้าเพิ่มข้อมูลนักศึกษา
app.get('/student/add', async (req, res) => {
    try {
        const [department] = await db.query(
            'SELECT * FROM department'
        );

        const [classes] = await db.query(
            'SELECT * FROM class'
        );

        res.render('add_student', {
            department,
            classes
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('ไม่สามารถโหลดข้อมูล Dropdown ได้');
    }
});

app.post('/student/add', async (req, res) => {
    const {
        id_std,
        name_std,
        surname_std,
        email_std,
        number_std,
        id_class,
        id_dept
    } = req.body;

    const sql = `
        INSERT INTO student
        (id_std, name_std, surname_std, email_std, number_std, id_class, id_dept)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        await db.query(sql, [
            id_std,
            name_std,
            surname_std,
            email_std,
            number_std,
            id_class,
            id_dept
        ]);

        res.redirect('/home');
    } catch (error) {
        console.error(error);
        res.status(500).send('ไม่สามารถบันทึกข้อมูลได้');
    }
});

app.delete('/api/student/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            'DELETE FROM student WHERE id_std = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลนักศึกษา'
            });
        }

        res.status(200).json({
            success: true,
            message: 'ลบข้อมูลสำเร็จ'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบข้อมูล'
        });
    }
});



// เปิดหน้าแก้ไขข้อมูลนักศึกษา
app.get('/student/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // ดึงข้อมูลนักศึกษา
    const [student] = await db.query(
      'SELECT * FROM student WHERE id_std = ?',
      [id]
    );

    if (student.length === 0) {
      return res.status(404).send('ไม่พบข้อมูลนักศึกษา');
    }

    // ดึงข้อมูลห้องเรียน
    const [classes] = await db.query(
      'SELECT * FROM class'
    );

    // ดึงข้อมูลแผนก
    const [department] = await db.query(
      'SELECT * FROM department'
    );

    // ส่งข้อมูลไปยังหน้า EJS
    res.render('edit_student', {
      student: student[0],
      classes: classes,
      department: department
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
  }
});



app.post('/student/edit/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name_std,
            surname_std,
            email_std,
            number_std,
            id_class,
            id_dept
        } = req.body;

        await db.query(
            `UPDATE student
             SET name_std = ?,
                 surname_std = ?,
                 email_std = ?,
                 number_std = ?,
                 id_class = ?,
                 id_dept = ?
             WHERE id_std = ?`,
            [
                name_std,
                surname_std,
                email_std,
                number_std,
                id_class,
                id_dept,
                id
            ]
        );

        res.redirect('/home');

    } catch (error) {
        console.error(error);
        res.status(500).send('เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    }
});


// เริ่มเซิร์ฟเวอร์
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

