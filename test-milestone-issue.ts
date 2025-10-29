import { LinearClient } from '@linear/sdk';

const apiKey = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey });

async function test() {
  // Get an issue
  const issue = await client.issue('LOC-278', { 
    include: { team: true, project: true }
  });
  
  console.log('Issue:', issue?.identifier);
  console.log('Issue type keys:', Object.keys(issue || {}).filter(k => k.includes('milestone') || k.includes('Milestone')));
  
  // Check what an update would accept
  console.log('\nTesting update with projectMilestoneId...');
  try {
    // This will fail but we can see the error
    const result = await issue?.update({ projectMilestoneId: 'test-id' } as any);
    console.log('Update result:', result);
  } catch (e: any) {
    console.log('Error:', e.message);
    if (e.response?.errors?.[0]) {
      console.log('GraphQL Error:', e.response.errors[0].message);
    }
  }
}

test().catch(console.error);
