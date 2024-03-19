const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
app.use(express.json());

// Load staff and loans data from JSON files
const staffData = JSON.parse(fs.readFileSync('staffs.json', 'utf8'));
const loansData = JSON.parse(fs.readFileSync('loans.json', 'utf8'));

// Secret key for JWT token
const secretKey = jwt.sign({}, 'ud4738dg983e90jw20d239d3d8gd389gf983', {
    algorithm: 'HS256',
    expiresIn: '1h' // Set the token expiration time
  });
  
  console.log('Secret Key:', secretKey);

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

// Login endpoint
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const staff = staffData.find(staff => staff.email === email && staff.password === password);
    if (!staff) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ email: staff.email, role: staff.role }, secretKey);
    res.json({ token });
});

// Logout endpoint
app.post('/logout', (req, res) => {
    // Clear user's session (not needed for JWT)
    res.json({ message: 'Logged out successfully' });
});

// Middleware for admin/superadmin role authorization
const isAdmin = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden' });
    }
};

// Endpoint to fetch all loans
app.get('/loans', verifyToken, (req, res) => {
    const loans = loansData.map(loan => {
        if (req.user.role === 'staff' && loan.userRole === 'applicant') {
            return { ...loan, totalLoan: 'hidden' };
        } else {
            return loan;
        }
    });
    res.json(loans);
});

// Endpoint to filter loans by status
app.get('/loans', verifyToken, (req, res) => {
    const status = req.query.status;
    const filteredLoans = loansData.filter(loan => loan.status === status);
    res.json(filteredLoans);
});

// Endpoint to fetch user's loans by email
app.get('/loans/:userEmail/get', verifyToken, (req, res) => {
    const userEmail = req.params.userEmail;
    const userLoans = loansData.filter(loan => loan.userEmail === userEmail);
    res.json({ loans: userLoans });
});

// Endpoint to fetch expired loans
app.get('/loans/expired', verifyToken, (req, res) => {
    const expiredLoans = loansData.filter(loan => new Date(loan.maturityDate) < new Date());
    res.json(expiredLoans);
});

// Endpoint to delete a loan
app.delete('/loan/:loanId/delete', verifyToken, isAdmin, (req, res) => {
    const loanId = req.params.loanId;
    const index = loansData.findIndex(loan => loan.id === loanId);
    if (index !== -1) {
        loansData.splice(index, 1);
        res.json({ message: 'Loan deleted successfully' });
    } else {
        res.status(404).json({ message: 'Loan not found' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
