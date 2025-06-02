const authorize = (...roles) => {
    return (req, res, next) => {
        // req.user will have the role_id from the decoded JWT
        if (!req.user || !roles.includes(req.user.role_name)) { // Assuming role_name is part of the JWT payload
            return res.status(403).json({ message: 'Forbidden: You do not have access to this resource.' });
        }
        next();
    };
};

module.exports = { authorize };