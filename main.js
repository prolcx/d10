//load express, sql
const { resolvePtr } = require('dns');
const express = require('express')
const handlebars = require('express-handlebars')
const mysql = require('mysql2/promise');
const { parse } = require('path');
const fetch = require('node-fetch')
const withQuery = require('with-query').default

// configure port
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

const startApp = async (app,pool) => {
    try{
        const conn = await pool.getConnection();
        console.info('Pinging database..')
        await conn.ping()
        conn.release()

        app.listen(PORT, () => {
            console.info(`Application started on port ${PORT} at ${new Date()}`)
        })
    } catch(e) {
        console.error('Cannot ping database: ', e)
    }
}

//create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: 'goodreads',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: 4
})

//SQL code

const alphabet = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9']
const SQL_TITLE = 'select * from book2018 where title REGEXP ?'
const SQL_BOOK_ID = 'select * from book2018 where book_id = ?'

// API parameter
const END_POINT = 'https://api.nytimes.com/svc/books/v3/reviews.json'
const API_KEY = process.env.API_KEY

// create instance of application
const app = express()

// configure handlebars
app.engine('hbs', handlebars({defaultLayout: 'default.hbs'}))
app.set('view engine', 'hbs')

//application
//landing page
app.get('/', (req, resp)=>{
        
        resp.status(200)
        resp.type('text/html')
        resp.render('index', {alphabet})
    
})

//list of books
app.get('/search/:cap', async (req,resp)=>{
    const cap =req.params['cap']
    const conn = await pool.getConnection()

    try{
        const titleName = []
        const results = await conn.query(SQL_TITLE, [`^[${cap}].*$`])
        console.info(results[0])
        const recs = results[0]
        console.info(recs)
        
        for (a of recs) {
            
            const b = a.title
            const c = a.book_id
            titleName.push({b,c})

            resp.status(200)
            resp.type('text/html')
            resp.render('result',{titleName, cap})
        }   
           
    } catch(e) {
		console.error('ERROR: ', e)
		resp.status(500)
		resp.end()
	} finally {
        conn.release()
    }}
)

//detail of book
app.get('/search/detail/:id', async (req,resp)=>{

    const id =req.params['id']
    const conn = await pool.getConnection()

    try{
        
        const results2 = await conn.query(SQL_BOOK_ID, [id])
        d = results2[0]   

        resp.status(200)
        resp.type('text/html')
        resp.render('detail',{d,id})
                   
    } catch(e) {
		console.error('ERROR: ', e)
		resp.status(500)
		resp.end()
	} finally {
        conn.release()
    }}
)

//review of book
app.get('/search/detail/review/:title', (req, resp)=>{
    
    const rawTitle =req.params['title']
    const title = rawTitle.replace(" ", "%20")
    console.info(title)
    
        let url = withQuery(END_POINT, {
    
            'api-key': API_KEY,
            'title': title
           
        })
    
    console.info(url)
    const p = fetch(url)
    
    p.then(result => result.json())
    .then(result =>{
         if (result.results.length <=0)
            return Promise.reject('Not found')
            
        const review = result.results
            resp.status(200)
            resp.type('text/html')
            resp.render('review',{review})
        
    })

})













app.use((req, resp) => {
	resp.redirect('/')
})

//start application
startApp(app, pool)