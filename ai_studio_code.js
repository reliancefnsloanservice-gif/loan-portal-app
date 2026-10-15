const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// डेटाबेस फ़ाइल चेक व क्रिएशन
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ applications: [] }, null, 2));
}

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    return { applications: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// नया लोन आवेदन सेव करना
app.post('/api/apply', (req, res) => {
  try {
    const { fullName, mobile, loanType, loanAmount, income, city } = req.body;
    if (!fullName || !mobile || !loanAmount) {
      return res.status(400).json({ success: false, message: 'आवश्यक विवरण दर्ज करें।' });
    }
    const db = readDB();
    const appId = 'LN-' + Math.floor(100000 + Math.random() * 900000);
    const newEntry = {
      id: appId,
      fullName,
      mobile,
      loanType,
      loanAmount: Number(loanAmount),
      income: Number(income),
      city: city || 'N/A',
      status: 'Application Submitted',
      remarks: 'Application under verification.',
      createdAt: new Date().toISOString()
    };
    db.applications.unshift(newEntry);
    writeDB(db);
    res.status(201).json({ success: true, message: 'आवेदन सफलतापूर्वक जमा हुआ!', appId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'सर्वर एरर!' });
  }
});

// स्टेटस ट्रैक करना
app.get('/api/track/:id', (req, res) => {
  const db = readDB();
  const item = db.applications.find(a => a.id.toUpperCase() === req.params.id.toUpperCase());
  if (!item) return res.status(404).json({ success: false, message: 'रिकॉर्ड नहीं मिला।' });
  res.json({ success: true, data: item });
});

// एडमिन लॉगिन
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    return res.json({ success: true, token: 'SESSION_ACTIVE' });
  }
  res.status(401).json({ success: false, message: 'अमान्य एडमिन क्रेडेंशियल!' });
});

// एडमिन डेटा लिस्ट
app.get('/api/admin/applications', (req, res) => {
  res.json({ success: true, data: readDB().applications });
});

// एडमिन CSV डाउनलोड
app.get('/api/admin/export-csv', (req, res) => {
  const db = readDB();
  const headers = ['Application ID', 'Name', 'Mobile', 'Loan Type', 'Amount', 'Income', 'Status', 'Date'];
  const rows = db.applications.map(a => [a.id, `"${a.fullName}"`, a.mobile, a.loanType, a.loanAmount, a.income, a.status, a.createdAt.split('T')[0]]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="loan_records.csv"');
  res.send([headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});