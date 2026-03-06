import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('BBWeather', () => App);
AppRegistry.runApplication('BBWeather', {
  rootTag: document.getElementById('root'),
});
