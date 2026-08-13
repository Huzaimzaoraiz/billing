const { branchWhere } = require('./backend/routes/shared');
console.log(branchWhere({ role: 'STAFF', branch_id: '123' }, { id: '456' }));
