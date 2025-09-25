require('dotenv').config();
const { findProfile } = require('./dao/clash/verification');

async function testProfileCommand() {
    console.log('Testing /profile command with tag: #9Y8GYQY0C');
    
    const tag = '9Y8GYQY0C';
    const playerResponse = await findProfile(tag);
    
    if (!playerResponse.response) {
        console.log('❌ Error:', playerResponse.error);
        return;
    }
    
    if (!playerResponse.response.found) {
        console.log('❌ Player not found');
        return;
    }
    
    const playerData = playerResponse.response.data;
    console.log('✅ Profile command working!');
    console.log('Player name:', playerData.name);
    console.log('Tag:', playerData.tag);
    console.log('Level:', playerData.expLevel);
    console.log('Town Hall:', playerData.townHallLevel);
    console.log('Clan:', playerData.clan ? playerData.clan.name : 'No clan');
}

testProfileCommand();