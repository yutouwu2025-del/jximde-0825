const axios = require('axios');

// 测试期刊搜索性能改进
async function testJournalSearch() {
  console.log('开始测试期刊搜索性能改进...');
  
  const baseURL = 'http://localhost:3000/api';
  const testToken = 'test_token'; // 在实际测试中需要有效token
  
  const config = {
    headers: {
      'Authorization': `Bearer ${testToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 35000 // 35秒超时，测试我们的改进
  };

  try {
    console.log('\n1. 测试第一次搜索 - Nature');
    const start1 = Date.now();
    const response1 = await axios.get(`${baseURL}/journals/search?keyword=nature&year=2023`, config);
    const end1 = Date.now();
    console.log(`第一次搜索耗时: ${end1 - start1}ms`);
    console.log(`返回结果数量: ${response1.data?.data?.length || 0}`);

    console.log('\n2. 测试第二次搜索 - Science (缓存测试)');
    const start2 = Date.now();
    const response2 = await axios.get(`${baseURL}/journals/search?keyword=science&year=2023`, config);
    const end2 = Date.now();
    console.log(`第二次搜索耗时: ${end2 - start2}ms`);
    console.log(`返回结果数量: ${response2.data?.data?.length || 0}`);

    console.log('\n3. 测试第三次搜索 - Cell');
    const start3 = Date.now();
    const response3 = await axios.get(`${baseURL}/journals/search?keyword=cell&year=2023`, config);
    const end3 = Date.now();
    console.log(`第三次搜索耗时: ${end3 - start3}ms`);
    console.log(`返回结果数量: ${response3.data?.data?.length || 0}`);

    console.log('\n4. 测试重复搜索 - Nature (缓存测试)');
    const start4 = Date.now();
    const response4 = await axios.get(`${baseURL}/journals/search?keyword=nature&year=2023`, config);
    const end4 = Date.now();
    console.log(`重复搜索耗时: ${end4 - start4}ms`);
    console.log(`返回结果数量: ${response4.data?.data?.length || 0}`);

    console.log('\n✅ 所有搜索测试完成，没有出现超时错误！');

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ 搜索请求超时');
    } else if (error.response?.status === 401) {
      console.log('ℹ️ 需要有效的认证token才能测试，但这是正常的认证检查');
    } else {
      console.error('❌ 搜索失败:', error.message);
    }
  }
}

// 运行测试
testJournalSearch();