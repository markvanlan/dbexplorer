let mysql = require('mysql');
let con;

let connectToDb = function(details, db) {
  return (
    mysql.createConnection({
      host: details.host,
      user: details.user,
      password: details.password,
      database: db
    })
  )
}

let pool  = mysql.createPool({
  connectionLimit : 10,
  host            : 'example.org',
  user            : 'bob',
  password        : 'secret',
  database        : 'my_db'
});


module.exports = {
  establishConnection: function(details, callback) {
    pool  = mysql.createPool({
      connectionLimit : 10,
      host            : details.host,
      user            : details.user,
      password        : details.password,
      database        : details.database
    });
    callback(true)
  },

  getDatabases: function(connection, callback) {
    pool.getConnection(function(err, connection) {
      if (err) throw err;
      connection.query('SHOW DATABASES', function (error, result, fields) {
        // When done with the connection, release it.        
        connection.release();
        if (error) throw error;
        let dbs = result.map(function(row){
          return row.Database
        })
        callback(dbs)
      });
    });
  },

  getTables: function(connection, db, callback) {
    pool  = mysql.createPool({
      connectionLimit : 10,
      host            : connection.host,
      user            : connection.user,
      password        : connection.password,
      database        : db
    });
    pool.getConnection(function(err, connection) {
      if (err) throw err;
      connection.query('SHOW TABLES', function (error, result, fields) {
        // When done with the connection, release it.        
        connection.release();
        if (error) throw error;
        let tables = result.map(function(row){
          return row[Object.keys(row)[0]];;
        })
        callback(tables)
      });
    });
  },
  getTableDetails: function(table, callback) {
    
    pool.getConnection(function(err, connection) {
      if (err) throw err;
      connection.query("DESCRIBE " + table, function (error, result, fields) {
        // When done with the connection, release it.        
        connection.release();
        if (error) throw error;
        callback(result)
      });
    });
  },

  getTableRowCount: function(table, callback) {
    pool.getConnection(function(err, connection) {
      if (err) throw err;
      query = ("SELECT COUNT(*) FROM " + table)
      connection.query(query, function (error, result, fields) {
        // When done with the connection, release it.        
        connection.release();
        if (error) throw error;
        callback(result)
      });
    });
  },  

  getTableData: function(table, offset, count, callback) {
    pool.getConnection(function(err, connection) {
      if (err) throw err;
      offset = offset - 1
      query = ("SELECT * FROM " + table + " LIMIT " + offset + "," + count)
      connection.query(query, function (error, result, fields) {
        // When done with the connection, release it.        
        connection.release();
        if (error) throw error;
        callback(result)
      });
    });
  },

  updateRow: function(table, values, callback) {
    // Get the updated values
    let newVals = values.newValues
    for (key in newVals) {
      if(values.originalValues[key] == newVals[key])
        delete newVals[key]
    }
    if (newVals = {})
      return callback(true)
    pool.getConnection(function(err, connection) {
      let primaryKey;
      // Check to see if you table has a primary key
      connection.query("SHOW KEYS FROM "+ table+ " WHERE Key_name = 'PRIMARY'", function (error, result, fields) {
        // When done with the connection, release it.        
        if (error) throw error;
        // If there is a primary key, lets update!!
        if (result[0])
          primaryKey = result[0].Column_name
        else primaryKey = null;

        let query;
        let set = "";
        if (primaryKey != null) {
          for(let key in newVals){
            set = set + key + " = '" + newVals[key]
            let lastKey = Object.keys(newVals)[Object.keys(newVals).length-1]
            if (key != lastKey)
              set = set + "', "
            else
              set = set + "'"
          }
          query = "UPDATE "+table+" SET "+set+" WHERE "+primaryKey+" = "+values.originalValues[primaryKey];
          console.log(query)
          connection.query(query, function (error, results, fields) {
            connection.release();
            if (error) throw error;
            callback(results)
          })
        }
        // If there is no primary key
        else {
          
          for(let key in newVals){
            // Set the Set portion
            set = set + key + " = '" + newVals[key]
            let lastKey = Object.keys(newVals)[Object.keys(newVals).length-1]
            if (key != lastKey)
              set = set + "', "
            else
              set = set + "'"            
          }

          // Set the where clause
          let where = "";
          for(let key in values.originalValues) {
            where = where + key + " = '" + values.originalValues[key]
            let lastKey = Object.keys(values.originalValues)[Object.keys(values.originalValues).length-1]
            if (key != lastKey)
              where = where + "' AND "
            else
              where = where + "'"          
          }
          
          query = "UPDATE "+table+" SET "+set+" WHERE "+where
          console.log(query)
          connection.query(query, function (error, results, fields) {
            connection.release();
            if (error) throw error;
            callback(results)
          })
        }
      });      
    });
  }
};