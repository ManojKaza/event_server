import express, { query } from 'express';
import bodyParser from 'body-parser';
import { Client } from 'pg';
import cookieParser from 'cookie-parser';
import { v4 } from 'uuid';
import moment,{Moment} from 'moment'

const app = express();

const client = new Client({
  host: 'localhost',
  user: 'manoj',
  database: 'Library',
  password: 'Admin',
  port: 5432,
})
const client1 = new Client({
  host: 'localhost',
  user: 'manoj',
  database: 'Audit',
  password: 'Admin',
  port: 5432,
})
client.connect();
client1.connect();

app.set('view engine','ejs')

const session:{[uuid:string]:{u_name:string,u_id:number,u_role:string}} = {};

//body parser middleware
 app.use(bodyParser.urlencoded({ extended: false }));
//cookie parser middleware
 app.use(cookieParser());
 
// function names(a: number, b: number) {
//   return new Promise<any>((resolve, reject) => {
//     const val: any[] = [];
//     client.query("SELECT username FROM users WHERE u_id = $1", [a], (err, result) => {
//       if (err) {
//         reject(err);
//       } else {
//         const user = result.rows[0];
//         if (user) {
//           val.push(user.username);
//         }
//         client.query("SELECT book_name FROM book_list WHERE b_id = $1", [b], (err, result) => {
//           if (err) {
//             reject(err);
//           } else {
//             const book = result.rows[0];
//             if (book) {
//               val.push(book.book_name);
//             }
//             resolve(val);
//           }
//         });
//       }
//     });
//   });
// }
function names(a:number,b:number, callback:(vals:String[])=>void){
  const vals:string[] = []; 
  client.query('SELECT username FROM users WHERE u_id = $1',[a],(err,result)=>{
    if(!err){
      vals.push(result.rows[0].username);
    }else{
      console.log(err)
    }
    client.query("SELECT book_name FROM book_list WHERE b_id = $1",[b],(err1,result1)=>{
      if(!err1){
        vals.push(result1.rows[0].book_name)
      }else{
        console.log(err1)
      }
      callback(vals)
    })
  })
}
function output_string(i:string,callback:(message:string)=>void){
  const data = JSON.parse(i);
  const operation:string = data.change[0].kind;
  const table:string = data.change[0].table;
  var message:string;
  switch(operation){
    case 'update':
      return "the books stocks are updated";
    case 'insert':
      if( table == 'loaned'){
        const values = data.change[0].columnvalues;
        names(values[0],values[1],(vals)=>
        {message = `The book with the title ${vals[1]} has been borrowed by the user ${vals[0]}.`;
        callback(message);});
      }
      break;
    case 'delete':
      if(table == 'loaned'){
        const values = data.change[0].oldkeys.keyvalues;
        names(values[0],values[1],(vals)=>
        {message = `The book with the title ${vals[1]} has been returned by the user ${vals[0]}.`;
        callback(message);});
      };
      break;
    default:
    return `command unrecongnisable ${operation}`;
  }
}
setInterval(() => {
    client.query("SELECT data FROM pg_logical_slot_get_changes('library', NULL, NULL, 'format-version', '1')",(err,result) =>{
        if(result.rowCount >= 1){
            for (const i of result.rows){
                const a = JSON.parse(i.data);
                const kind:string = a.change[0].kind;
                if (kind == 'insert' || kind == 'delete'){
                  output_string(i.data,(message)=>{
                    console.log(message);
                    client1.query('INSERT INTO audit_log (log_text) VALUES($1)',[message],(err,result)=>{
                    })
                  })
                }
            }
        }
    })
},1000)
app.listen(4000)


