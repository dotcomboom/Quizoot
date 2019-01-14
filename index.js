const fs = require('fs');
const express = require('express');
var bodyParser = require("body-parser");
var XLSX = require('xlsx');

// https://stackoverflow.com/a/17606289
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

// https://stackoverflow.com/a/2450976
function doShuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;
  
  while (0 !== currentIndex) {
  	randomIndex = Math.floor(Math.random() * currentIndex);
  	currentIndex -= 1;
  	
  	temporaryValue = array[currentIndex];
  	array[currentIndex] = array[randomIndex];
  	array[randomIndex] = temporaryValue;
  }
  
  return array;
}

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));

app.post('/quizoot', (req, res) => {
  input = req.body.quizlet
  td = req.body.td
  row = req.body.row
  time = parseInt(req.body.time)
  max = parseInt(req.body.max)
  shuffle = req.body.shuffle
  qprefix = req.body.qprefix
  qsuffix = req.body.qsuffix
  aprefix = req.body.aprefix
  asuffix = req.body.asuffix

  input = input.replaceAll('\r\n', row)
  input = input.replaceAll('\n', row)
  lines = input.split(row)
  qdb = []
  answerPool = []
  if (max < 2) {
    res.send('Error: max amount of answers is too low! It must be between 2 and 4.')
  }
  if (max > 4) {
    res.send('Error: max amount of answers is too hight! It must be between 2 and 4.')
  }
  if (time < 5) {
    res.send('Error: time limit too low!')
  }
  if (time > 120) {
    res.send('Error: time limit too high!')
  }
  lines.forEach(function (line) {
    question = ""
    if (line.includes(td)) {
      lsplit = line.split(td)
      term = qprefix + lsplit[0] + qsuffix
      lsplit.shift()
      definition = aprefix + lsplit.join(td) + asuffix
      qdb.push({ "term": term, "definition": definition })
      answerPool.push(definition)
    }
  });
  if (qdb.length < 3) {
    res.send('Error: not enough terms and definitions! Make sure you have at least three.')
  }
  if (qdb.length < max) {
    max = qdb.length
  }
  if (shuffle == 'shuffle') {
  	qdb = doShuffle(qdb)
  }
  var workbook = XLSX.readFile('template.xlsx');
  var sheet = workbook.Sheets[workbook.SheetNames[0]];
  // starts row 9, column b
  // b: question
  // c: answer 1
  // d: answer 2
  // e: answer 3
  // f: answer 4
  // g: time limit
  // h: correct answer(s)
  currentRow = 8
  index = 0
  while (index < qdb.length) {
    currentRow += 1

    sheet['B' + currentRow] = {"t": "s", "v": qdb[index].term}

    possibleAnswers = ['1', '2', '3', '4']
    while (possibleAnswers.length > max) {
      possibleAnswers.pop()
    }
    correctAnswer = possibleAnswers[Math.floor(Math.random() * possibleAnswers.length)]
    
    apCopy = answerPool.slice()
    apCopy.forEach(function (i, answer) {
    	if (answer == qdb[index].definition) {
    		apCopy.splice(i, 1)
    	}
    });
  
    if (correctAnswer == '1') {
      sheet['C' + currentRow] = {"t": "s", "v": qdb[index].definition}
    } else {
      randWrongIndex = Math.floor(Math.random() * apCopy.length)
      sheet['C' + currentRow] = {"t": "s", "v": apCopy[randWrongIndex]}
      apCopy.splice(randWrongIndex, 1)
	  }

    if (correctAnswer == '2') {
      sheet['D' + currentRow] = {"t": "s", "v": qdb[index].definition}
    } else {
      randWrongIndex = Math.floor(Math.random() * apCopy.length)
      sheet['D' + currentRow] = {"t": "s", "v": apCopy[randWrongIndex]}
      apCopy.splice(randWrongIndex, 1)
    }

    if (max > 2) {
      if (correctAnswer == '3') {
        sheet['E' + currentRow] = {"t": "s", "v": qdb[index].definition}
      } else {
      	randWrongIndex = Math.floor(Math.random() * apCopy.length)
      	sheet['E' + currentRow] = {"t": "s", "v": apCopy[randWrongIndex]}
      	apCopy.splice(randWrongIndex, 1)
      }
    }

    if (max > 3) {
      if (correctAnswer == '4') {
        sheet['F' + currentRow] = {"t": "s", "v": qdb[index].definition}
      } else {
      	randWrongIndex = Math.floor(Math.random() * apCopy.length)
      	sheet['F' + currentRow] = {"t": "s", "v": apCopy[randWrongIndex]}
      	apCopy.splice(randWrongIndex, 1)
      }
    }

    sheet['G' + currentRow] = {"t": "s", "v": time}
    sheet['H' + currentRow] = {"t": "s", "v": correctAnswer}

    index += 1
  }
  newwb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newwb, sheet, "Sheet1");
  filename =
    'temp/' + Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5) + '.xlsx';
  XLSX.writeFile(newwb, filename);
  res.download(filename, filename.replace('temp/', 'quizoot '), function (err) {
    if (!err) {
      fs.unlink(filename);
    }
  });
});

app.listen(3000, () => {
  console.log('server started');
});