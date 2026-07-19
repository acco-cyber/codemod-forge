// Demo app
// This is a React 17 project that needs migration to React 19.
// Run: npx codemod-forge react --from 17 --to 19 ./demo

import React from 'react';
import Button from './components/button';
import Select from './components/select';
import Alert from './components/alert';
import { Card, Layout } from './components/card';

function App() {
  const handlePrimary = () => console.log('Primary clicked');
  const handleSelect = (val: string) => console.log('Selected:', val);

  return (
    <Layout sidebar={<nav>Navigation</nav>}>
      <Card title="Dashboard">
        <Alert message="Welcome to the demo!" severity="info" />
        <Button variant="primary" onClick={handlePrimary}>
          Get Started
        </Button>
        <Select
          options={['React 17', 'React 18', 'React 19']}
          value="React 17"
          onChange={handleSelect}
          label="Select version"
        />
      </Card>
    </Layout>
  );
}

export default App;
