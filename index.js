
const express = require('express');
const db = require('./db');

const app = express();
const PORT = 3000;

// ตั้งค่า EJS เป็น Template Engine
app.set('view engine', 'ejs');

// อ่านข้อมูลจาก Form
app.use(express.urlencoded({ extended: true }));

// เปิดให้เข้าถึงไฟล์ใน public
app.use(express.static('public'));

// หน้าแรก แสดงรายชื่อนักศึกษา
app.get('/', async (req, res) => {
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

        res.redirect('/');
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

        res.redirect('/');

    } catch (error) {
        console.error(error);
        res.status(500).send('เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    }
});


// เริ่มเซิร์ฟเวอร์
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

