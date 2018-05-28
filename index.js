/*
	sr2-compare
	By Sam Lynch

	Covered by MIT Licence, refer to
	LICENSE.md for more information
 */

let fs = require('fs');
let jsDiff = require('diff');

// https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
function hashCode(str){
	let hash = 0,
		i,
		chr;
	if (str.length === 0) return hash;
	for (i = 0; i < str.length; i++) {
		chr = str.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
}

/*
Algorithm flow:
	- Index all files in both directories
	- Check for files that don't exist in Directory B from Directory A
		+ Report/note any files that don't exist
	- For files that do exist, hash them (only plaintext files?)
	- Compare the hashes; if different, report back
	- Else, run through a diff tool
 */

// CONSTANTS
const extensionsToDiff = [
	'.lua',
	'.xtbl',
	'.tbl',
	'.ods'
];

// GLOBALS
let nonPresentFiles,
	differentFiles;

function main() {
	let dirA = indexFilesInDirectory('dirA');
	let dirB = indexFilesInDirectory('dirB');

	let stage1 = checkFileNames(dirA, dirB); // files that dont exist in dirB
	nonPresentFiles = stage1.nonPresentFiles;

	let stage2 = checkExistingFiles(stage1.presentFiles);
	differentFiles = stage2.differentFiles;

	// diff check different files
	let diffs = {};
	for(let k in differentFiles){
		if(!differentFiles.hasOwnProperty(k)) continue;

		if (!extensionsToDiff.some(function(v) { return k.indexOf(v) >= 0; })) {
			// There's no matching extension
			continue;
		}

		diffs[k] = jsDiff.createTwoFilesPatch(k + '.dirA', k + '.dirB', differentFiles[k].a.data,differentFiles[k].b.data);
		fs.writeFileSync('./diffs/' + k + '.diff', diffs[k]);
	}

	onComplete();
}

function checkExistingFiles(filenames){
	let output = {
		identicalFiles: [],
		differentFiles: {},
		files: {}
	};

	let files = {
		'dirA': {},
		'dirB': {}
	};
	for(let i = 0; i < filenames.length; i++){
		files['dirA'][filenames[i]] = {
			data: null,
			hash: 0
		};
		files['dirA'][filenames[i]]['data'] = fs.readFileSync('dirA/' + filenames[i], 'utf8');
		files['dirA'][filenames[i]]['hash'] = hashCode(files['dirA'][filenames[i]]['data']);

		files['dirB'][filenames[i]] = {
			data: null,
			hash: 0
		};
		files['dirB'][filenames[i]]['data'] = fs.readFileSync('dirB/' + filenames[i], 'utf8');
		files['dirB'][filenames[i]]['hash'] = hashCode(files['dirB'][filenames[i]]['data']);
	}

	for(let k in files['dirA']){
		if(!files['dirA'].hasOwnProperty(k)) continue;

		let currA = files['dirA'][k]['hash'];
		let currB = files['dirB'][k]['hash'];

		if(currA !== currB){
			output.differentFiles[k] = {
				a: files['dirA'][k],
				b: files['dirB'][k]
			}
		} else {
			output.identicalFiles.push(k);
		}
	}

	return output;
}

function onComplete(){
	console.log('Done! %i different files were found, and %i files were not found in directory B', Object.keys(differentFiles).length, nonPresentFiles.length);
	console.log('Files not found in directory B: ' + nonPresentFiles);
	console.log('Different files in directory B: ' + Object.keys(differentFiles));
}

function checkFileNames(dirA, dirB){
	let output = {
		nonPresentFiles: [],
		presentFiles: []
	};

	for(let i = 0; i < dirA.length; i++){
		if(!dirB.includes(dirA[i])){
			output.nonPresentFiles.push(dirA[i]);
		} else {
			output.presentFiles.push(dirA[i]);
		}
	}

	return output;
}

function indexFilesInDirectory(folder) {
	return _walkSync(folder + '/');
}

// List all files in a directory in Node.js recursively in a synchronous fashion
function _walkSync(dir, filelist) {
	let files = fs.readdirSync(dir);
	filelist = filelist || [];
	files.forEach(function (file) {
		if (fs.statSync(dir + file).isDirectory()) {
			filelist = _walkSync(dir + file + '/', filelist);
		}
		else {
			filelist.push(file);
		}
	});
	return filelist;
}

main();