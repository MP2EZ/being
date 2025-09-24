import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NewArchitectureTest: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏗️ Minimal Architecture Test</Text>
      <Text style={styles.text}>Testing if basic app structure works without property descriptor errors</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});

export default NewArchitectureTest;