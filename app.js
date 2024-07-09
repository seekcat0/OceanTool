const inquirer = require('inquirer');
const fs = require('fs');
const axios = require('axios');
const logger = require('node-color-log');
const path = require('path');
const crypto = require('crypto');
const banner = `
  $$$$$$\\                      $$\\              $$$$$$\\                                                              
  $$  __$$\\                     $$ |            $$  __$$\\                                                             
  $$ /  \\__| $$$$$$\\   $$$$$$\\  $$ |  $$\\       $$ /  \\__| $$$$$$\\   $$$$$$\\ $$\\    $$\\  $$$$$$\\   $$$$$$\\   $$$$$$$\\ 
  \\$$$$$$\\  $$  __$$\\ $$  __$$\\ $$ | $$  |      \\$$$$$$\\  $$  __$$\\ $$  __$$\\\\$$\\  $$  |$$  __$$\\ $$  __$$\\ $$  _____|
   \\____$$\\ $$$$$$$$ |$$$$$$$$ |$$$$$$  /        \\____$$\\ $$$$$$$$ |$$ |  \\__|\\$$\\$$  / $$$$$$$$ |$$ |  \\__|\\$$$$$$\\  
  $$\\   $$ |$$   ____|$$   ____|$$  _$$<        $$\\   $$ |$$   ____|$$ |       \\$$$  /  $$   ____|$$ |       \\____$$\\ 
  \\$$$$$$  |\\$$$$$$$\\ \\$$$$$$$\\ $$ | \\$$\\       \\$$$$$$  |\\$$$$$$$\\ $$ |        \\$  /   \\$$$$$$$\\ $$ |      $$$$$$$  |
   \\______/  \\_______| \\_______|\\__|  \\__|       \\______/  \\_______|\\__|         \\_/     \\_______|\\__|      \\_______/ 
                                                                                                                      
                                                                                                                      
                                                                                                                      
`;

const versionUrl = 'https://raw.githubusercontent.com/seekcat0/OceanTool/main/version.json'; // Thay thế bằng URL thực tế của bạn
const currentVersion = '0.0.0.2'; // Thay thế bằng phiên bản hiện tại của bạn

const usernamesFilePath = path.join(__dirname, 'usernames.txt');
const userJsonFilePath = path.join(__dirname, 'user.json');
const BypassFilePath = path.join(__dirname, 'bypass.txt');

fs.writeFileSync(BypassFilePath, '');
fs.appendFileSync(BypassFilePath, banner);

// Hàm kiểm tra phiên bản
const checkVersion = async () => {
  try {
    const response = await axios.get(versionUrl);
    const latestVersion = response.data.version;

    if (latestVersion !== currentVersion) {
      logger.warn('Detected New Update:');
      logger.warn(`Your current version: ${currentVersion}`);
      logger.warn(`New Version: ${latestVersion}`);
      logger.warn('https://raw.githubusercontent.com/seekcat0/OceanTool/main/app.js');

      // Fetch và dán mã mới vào tệp
      const newCodeResponse = await axios.get('https://raw.githubusercontent.com/seekcat0/OceanTool/main/app.js');
      const newCode = newCodeResponse.data;
      fs.writeFileSync(__filename, newCode);
      logger.success('Updated to the latest version. Please restart the application.');
      process.exit(0);
    } else {
      logger.success('You are using the latest version.');
    }
  } catch (error) {
    logger.error('Error checking version:', error.message);
  }
};

// Gọi hàm kiểm tra phiên bản trước khi thực hiện các hàm khác
checkVersion();

// Hàm để đọc tên người dùng từ file
const readUsernames = () => {
  return new Promise((resolve, reject) => {
    fs.readFile(usernamesFilePath, 'utf8', (err, data) => {
      if (err) {
        return reject(err);
      }
      const usernames = data.split('\n').map(name => name.trim()).filter(Boolean);
      const uniqueUsernames = [...new Set(usernames)];
      resolve(uniqueUsernames);
    });
  });
};

// Hàm để kiểm tra key API
const checkLicenseKey = async (inputKey) => {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/seekcat0/SeekApi/main/apikey.json');
    const apiKeys = response.data;
    return apiKeys.includes(inputKey);
  } catch (error) {
    logger.error('Error fetching License Key:', error.message);
    return false;
  }
};

// Hàm để lấy ID người dùng từ username
async function getId(name) {
  try {
    const response = await axios.post('https://users.roblox.com/v1/usernames/users', {
      "usernames": [name],
      "excludeBannedUsers": true
    });

    const data = response.data.data;
    if (data.length > 0) {
      return data[0].id;
    } else {
      throw new Error(`User ID not found for username "${name}"`);
    }
  } catch (error) {
    logger.error(`fetching ID for username "${name}": ${error.message}`);
    return null;
  }
}

const fetchBypassUser = async (usernames, options) => {
  const failedUsers = [];

  for (const username of usernames) {
    let retry = true;

    while (retry) {
      try {
        const userId = await getId(username);
        if (!userId) {
          logger.error(`User ID not found for username "${username}"`);
          break;
        }

        let link;
        if (options === "service_delta") {
          link = `https://gateway.platoboost.com/a/8?id=${userId}`;
        } else if (options === "service_hydrogen") {
          link = `https://gateway.platoboost.com/a/2569?id=${userId}`;
        }

        logger.debug(`Get key for username "${username}"`);
        const secondResponse = await axios.get(`http://45.90.13.151:6132/api/bypass?link=${link}&api_key=neyoshidzqua`);

        if (secondResponse.data.key) {
          const logMessage = `"${username}": [ Key: "${secondResponse.data.key}" | TimeTaken: "${secondResponse.data.duration}" ]`;
          logger.success(logMessage);
          fs.appendFileSync(BypassFilePath, logMessage + '\n');
          retry = false;
        } else if (!secondResponse.data.key) {
          logger.warn(`"${username}": [Detected Value key is undefined. Retrying...]`);
        }
      } catch (error) {
        logger.error(`Processing username "${username}": ${error.message}`);
        retry = false; // Dừng vòng lặp khi gặp lỗi
      }
    }

    if (retry) {
      failedUsers.push(username);
    }
  }

  // Nếu có người dùng thất bại, thử lại
  if (failedUsers.length > 0) {
    logger.warn(`Retrying for failed users...`);
    await fetchBypassUser(failedUsers, options);
  }
};

// Hàm để in khung Seek Servers
const printSeekServersBanner = () => {
  logger.debug(banner);
};

// Hàm để tạo file user.json sau khi kiểm tra license key
const createUserJson = async () => {
  const userDetails = await inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'Enter your username:'
    },
    {
      type: 'input',
      name: 'licensekey',
      message: 'Enter your license key:'
    }
  ]);
  logger.debug("Check license Key");
  const isValid = await checkLicenseKey(userDetails.licensekey);

  if (isValid) {
    const userJsonContent = {
      username: userDetails.username,
      licensekey: userDetails.licensekey
    };

    fs.writeFileSync(userJsonFilePath, JSON.stringify(userJsonContent, null, 2));
    logger.success('user.json has been created successfully.');
    setTimeout(async () => {
      console.clear();
      await checkUserJson();
    });
  } else {
    logger.error('License Key not Support :P');
  }
};

const MyUI = async () => {
  logger.success('License Key Login !');
  console.clear(); 
  printSeekServersBanner();
  logger.info(`
Please make 1 file usernames.txt
1. Make usernames.txt
-- Belike:
=======================
||                SeekCat00001               ||
||                SeekCat00002               ||
||                SeekCat00003               ||
=======================
If enter display name then auto key will be errors
You can change any time in usernames.txt nothing
Enter like on top no like:
=======================
||                SeekCat00001               ||
||                                           ||
||                SeekCat00002               ||
||                                           ||
||                SeekCat00003               ||
=======================
Choosen sevice then enter when done...
`);

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'option',
      message: 'Select 1 service of keysystem for all account',
      choices: [
        { name: '1. Delta (Best)', value: 'delta' },
        { name: '2. Hydrogen (Normal)', value: 'hydrogen' }
      ]
    }
  ]);

  if (answers.option === 'delta') {
    try {
      const usernames = await readUsernames();
      logger.debug(`Total username: ${usernames.length}`);
      await fetchBypassUser(usernames, "service_delta");
    } catch (err) {
      logger.error('We catch error current bypass sorry to problem its contact ');
    }
  } else if (answers.option === 'hydrogen') {
    try {
      const usernames = await readUsernames();
      logger.debug(`Total username: ${usernames.length}`);
      await fetchBypassUser(usernames, "service_hydrogen");
    } catch (err) {
      logger.error('We catch error current bypass sorry to problem its contact ');
    }
  } else {
    logger.error('Options errors :P');
  }
};

// Hàm để kiểm tra xem user.json có tồn tại không
const checkUserJson = () => {
  if (fs.existsSync(userJsonFilePath)) {
    printSeekServersBanner();
    const userJson = JSON.parse(fs.readFileSync(userJsonFilePath, 'utf8'));
    logger.success(`Login at username: "${userJson.username}".`);
    logger.debug('Check license key ...');
    checkLicenseKey(userJson.licensekey).then(isValid => {
      if (isValid) {
        MyUI();
      } else {
        logger.error('License Key not Support :P');
      }
    });
  } else {
    mainMenu();
  }
};

// Menu chính
const mainMenu = async () => {
  printSeekServersBanner();

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'option',
      message: 'Select 1 option',
      choices: [
        { name: '1. License Key (Use Now)', value: 'license_key' },
        { name: '2. Make File User.json (Make Account)', value: 'make_user_json' }
      ]
    }
  ]);

  if (answers.option === 'license_key') {
    const apiKeyAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'licensekey',
        message: 'Enter your license key:'
      }
    ]);

    const isValid = await checkLicenseKey(apiKeyAnswer.licensekey);

    if (isValid) {
      MyUI();
    } else {
      logger.error('License Key not Support :P');
    }
  } else if (answers.option === 'make_user_json') {
    await createUserJson();
  }
};

// Kiểm tra file user.json khi chạy chương trình
checkUserJson();
