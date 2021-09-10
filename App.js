import React, {Component} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Image,
  NativeEventEmitter,
  NativeModules,
  Platform, AppState,
  PermissionsAndroid,
  Alert
} from 'react-native';
import Switch from 'react-native-switch-pro';
import BleManager, {stopScan} from 'react-native-ble-manager';
import {observer} from "mobx-react";
import dataStore from "./store/dataStore";
import { observe } from 'mobx';
import {stringToBytes} from 'convert-string';
import Slider from '@react-native-community/slider';
import Spinner from 'react-native-loading-spinner-overlay';

var connectedId = '';
var dataArray = [];

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
@observer
export default class Main extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scanning: false,
      peripherals: new Map(),
      appState: '',
      AutoTextColor:"#A8A8A8",
      AutoBackgroundColor:"#EEEEEE",
      LowTextColor:"#A8A8A8",
      LowBackgroundColor:"#EEEEEE",
      MediumTextColor:"#A8A8A8",
      MediumBackgroundColor:"#EEEEEE",
      HighTextColor:"#A8A8A8",
      HighBackgroundColor:"#EEEEEE",

      spinner: false,
    };
    this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
    this.handleStopScan = this.handleStopScan.bind(this);
    this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(
      this,
    );
    this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(
      this,
    );
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
   
  }

  componentDidMount() {
    AppState.addEventListener('change', this.handleAppStateChange);

    BleManager.start({showAlert: false});

    this.handlerDiscover = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      this.handleDiscoverPeripheral,
    );
    this.handlerStop = bleManagerEmitter.addListener(
      'BleManagerStopScan',
      this.handleStopScan,
    );
    this.handlerDisconnect = bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      this.handleDisconnectedPeripheral,
    );
    this.handlerUpdate = bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      this.handleUpdateValueForCharacteristic,
    );

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then((result) => {
        if (result) {
          console.log('Permission is OK');
          BleManager.enableBluetooth()
            .then(() => {
              // Success code
              console.log(
                'The bluetooth is already enabled or the user confirm',
              );
            })
            .catch((error) => {
              // Failure code
              console.log('The user refuse to enable bluetooth');
            });
        } else {
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ).then((result) => {
            if (result) {
              console.log('User accept');
            } else {
              console.log('User refuse');
            }
          });
        }
      });
    }
    setTimeout(()=>{
      this.startScan();
    },200)
    
    setTimeout(()=>{
      setInterval(()=>{
        this.retrieveConnected();
      },2100)
    },3000)
      
      this.setState({
        spinner: !this.state.spinner,
      });
    
    
      
   
  }

  handleAppStateChange(nextAppState) {
    if (
      this.state.appState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('App has come to the foreground!');
      BleManager.getConnectedPeripherals([]).then((peripheralsArray) => {
        console.log('Connected peripherals: ' + peripheralsArray.length);
      });
    }
    this.setState({appState: nextAppState});
  }
  componentWillUnmount() {
    this.handlerDiscover.remove();
    this.handlerStop.remove();
    this.handlerDisconnect.remove();
    this.handlerUpdate.remove();
  }
  handleUpdateValueForCharacteristic(data) {}
  handleDisconnectedPeripheral(data) {
    let peripherals = this.state.peripherals;
    let peripheral = peripherals.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = false;
      peripherals.set(peripheral.id, peripheral);
      this.setState({peripherals});
    }
    console.log('Disconnected from ' + data.peripheral);
    data = 'off';
  }
  handleStopScan() {
    console.log('Scan is stopped');
    this.setState({scanning: false});
    this.setState({
      spinner: false,
    });
    
      
    
  }
  startScan() {
    if (!this.state.scanning) {
      //this.setState({peripherals: new Map()});
      BleManager.scan([], 1.2, true).then((results) => {
        console.log('Scanning...');
        this.setState({scanning: true});
        this.setState({
          spinner: !this.state.spinner,
        });
      });
    }
  }
  handleDiscoverPeripheral(peripheral) {
   
   
    if (peripheral.name == "HomeAutomation") {
      var peripherals = this.state.peripherals;
      console.log('Got ble peripheral', peripheral);
      peripherals.set(peripheral.id, peripheral);
      this.setState({peripherals});
      BleManager.stopScan();
      
        setTimeout(() => {
          BleManager.connect(peripheral.id)
            .then(() => {
              let peripherals = this.state.peripherals;
              let p = peripherals.get(peripheral.id);
              if (p) {
                p.connected = true;
                peripherals.set(peripheral.id, p);
                this.setState({peripherals});
              }
              console.log('Connected to ' + peripheral.id);
              connectedId = peripheral.id;
  
              setTimeout(() => {
                BleManager.retrieveServices(
                  peripheral.id,
                ).then((peripheralInfo) => {
                  dataStore.deviceUid = peripheralInfo.id;
                  console.log(peripheralInfo.id);

              });
              }, 100);
            })
            .catch((error) => {
              console.log('in test error');
              console.log('Connection error', error);
            });
        }, 200);
     
      
    }
   
    
    
  }
  
  retrieveConnected() {
    var len;
    BleManager.getConnectedPeripherals([]).then((results) => {
      len = results.length;
      if (results.length == 0) {
        console.log('No connected peripherals');
      }

      var peripherals = this.state.peripherals;
      for (var i = 0; i < results.length; i++) {
        var peripheral = results[i];
        peripheral.connected = true;
        peripherals.set(peripheral.id, peripheral);
        this.setState({peripherals});
        connectedId = peripheral.id;
      }
    });
    if (len != 0) {
      BleManager.retrieveServices(connectedId).then((peripheralInfo) => {
        BleManager.read(
          dataStore.deviceUid,
          '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
          '6E400003-B5A3-F393-E0A9-E50E24DCCA9E',
        )
          .then((readData) => {
            // Success code

            var readData2 = String(readData);
            var FullArray = readData2.split(',');
            var stringWithComa = String.fromCharCode.apply(String, FullArray);

            var newStringWithComa = String(stringWithComa);
            var PartArray = newStringWithComa.split(',');
            dataArray = PartArray;
            console.log(
              '0> ' +
                PartArray[0] +
                ' -1> ' +
                PartArray[1] +
                ' -2> ' +
                PartArray[2] +
                ' -3> ' +
                PartArray[3]
            );
            
           
          })
          .catch((error) => {
            console.log('Connection error!');
          });
      });
    }
  }

  disconnect() {
    BleManager.getConnectedPeripherals([]).then((results) => {
      if (results.length == 0) {
        console.log('No connected peripherals');
      }

      var peripherals = this.state.peripherals;
      for (var i = 0; i < results.length; i++) {
        var peripheral = results[i];
        peripheral.connected = true;
        peripherals.set(peripheral.id, peripheral);
        this.setState({peripherals});
        connectedId = peripheral.id;
      }
    });

    BleManager.disconnect(connectedId)
      .then(() => {
        // Success code
        console.log('Disconnected');
        alert('Disconnected Successful');

        connectedId = '';
        this.props.navigation.navigate('ConnectScreen');
      })
      .catch((error) => {
        // Failure code
        console.log('Connection error!');
      });
  }

  
 
 
  
  float2int (value) {
    return value | 0;
}
  

  render() {
    
   
   
    
    const dataTemperature = dataArray[0] == null ? '--' : dataArray[0];
    const dataHumidity = dataArray[1] == null ? '--' : dataArray[1];
    const dataPressure = dataArray[2] == null ? '--' : dataArray[2];
    const dataKacak = dataArray[3] == 1 ? 'Gas leak' : "No gas leak";
    const dataTime = dataArray[4] == null ? '1' : dataArray[4];
    const dataEco = dataArray[5] == 0 ? false : true;
    
    
    return (
      <View style={{backgroundColor: '#eeeeee', flex: 1}}>
       {/* <Spinner
            visible={this.state.spinner}
            textContent={'Receiving data please wait..'}
            textStyle={{fontSize:19}}
          />*/}
        <StatusBar backgroundColor="#000000" barStyle="dark-content" />

        <View
          style={{
            width: (Dimensions.get('screen').width * 90) / 100,
            height: 30,
            borderRadius: 15,
            backgroundColor: '#fff',
            top: '5%',
            alignSelf: 'center',
            justifyContent: 'center',
          }}>
          <Text
            style={{
              color: '#A8A8A8',
              fontWeight: 'bold',
              fontSize: 16,
              left: '4%',
            }}>
            Smart Home App
          </Text>
          
        </View>
        <View style={{flexDirection: 'column', top: '9%'}}>
          <View style={{alignSelf: 'center', alignItems: 'center'}}>
            <Image
              source={require('./images/AirQuality.png')}
              style={{
                height: (Dimensions.get('screen').height * 8) / 100,
                resizeMode: 'contain',
              }}
            />
            <Text style={{color: '#484848', fontSize: 21, fontWeight: 'bold'}}>
              {dataKacak}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginHorizontal: '7%',

              top: '3%',
            }}>
            <View style={{alignSelf: 'center', alignItems: 'center'}}>
              <Image
                source={require('./images/Temperature.png')}
                style={{
                  height: (Dimensions.get('screen').height * 8) / 100,
                  resizeMode: 'contain',
                }}
              />
              <Text
                style={{color: '#484848', fontSize: 22, fontWeight: 'bold'}}>
                {dataTemperature} °C
              </Text>
            </View>
            <View
              style={{
                alignSelf: 'center',

                left: '19%',
              }}>
              <Image
                source={require('./images/Humidity.png')}
                style={{
                  height: (Dimensions.get('screen').height * 8) / 100,
                  resizeMode: 'contain',
                }}
              />
              <Text
                style={{
                  color: '#484848',
                  fontSize: 22,
                  fontWeight: 'bold',
                  top: '1%',
                  left: '9%',
                }}>
                % {dataHumidity}
              </Text>
            </View>
            <View style={{alignSelf: 'center', alignItems: 'center'}}>
              <Image
                source={require('./images/AirPressure.png')}
                style={{
                  height: (Dimensions.get('screen').height * 8) / 100,
                  resizeMode: 'contain',
                }}
              />
              <Text
                style={{
                  color: '#484848',
                  fontSize: 20.8,
                  fontWeight: 'bold',
                }}>
                % {dataPressure} 
              </Text>
            </View>
          </View>
         
         
        </View>

        
        <View
          style={{
            backgroundColor: '#fff',
            width: (Dimensions.get('screen').width * 95) / 100,
            height: 2.5,
            marginTop: '25%',
            alignSelf: 'center',
          }}></View>
        <View
          style={{
            backgroundColor:"#505050",
            width: (Dimensions.get('screen').width * 90) / 100,
            height: '10%',
            marginTop: '5%',
            alignSelf: 'center',
            borderRadius: (Dimensions.get('screen').width * 5) / 100,
          }}>
          <Image
            source={require('./images/light.png')}
            style={{
              width: (Dimensions.get('screen').width * 7) / 100,
              height: (Dimensions.get('screen').width * 11) / 100,
              marginTop:"2%",
              resizeMode: 'contain',
              marginLeft: '3%',
              position: 'absolute',
            }}
          />
          
          <Text
            style={{
              fontSize: 17,
              color: '#A8A8A8',
              position: 'absolute',
              marginLeft: '17%',
              marginTop: '1%',fontWeight:"bold"
            }}>
            Light switch
          </Text>
          <Text
            
            style={{
              fontSize: 14,
              color: '#A8A8A8',
              position: 'absolute',
              marginLeft: '17%',
              marginTop: '7%',
            }}>
            You can turn on 
            or turn off{"\n"}your lights.
          </Text>
          <Switch
            backgroundInactive="#565658"
            style={{position: 'absolute', right: '4%', top: '12%'}}
            height={(Dimensions.get('screen').height * 4.2) / 100}
            width={(Dimensions.get('screen').width * 14) / 100}
            value={dataEco}
            onSyncPress={(value) => {
              console.log(value);
              BleManager.getConnectedPeripherals([]).then((results) => {
                if (results.length == 0) {
                  console.log('No connected peripherals');
                }
                //console.log(results);
                var peripherals = this.state.peripherals;
                for (var i = 0; i < results.length; i++) {
                  var peripheral = results[i];
                  peripheral.connected = true;
                  peripherals.set(peripheral.id, peripheral);
                  this.setState({peripherals});
                  connectedId = peripheral.id;
                }
              });
              if(!value){
                var newD = stringToBytes('on');
              }else{
                var newD = stringToBytes('off');
              }
              
              BleManager.write(
                dataStore.deviceUid,
                '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
                '6E400002-B5A3-F393-E0A9-E50E24DCCA9E',
                newD,
              )
                .then(() => {
                  if(!value){
                    console.log('Light mod off and writed: ' + newD);
                  }else{
                    console.log('Light mod on and writed: ' + newD);
                  }
                  
                  
                })
                .catch((error) => {
                  if (error != null) {
                    alert('error: ' + error);
                  }
                });
              
              //console.log(value);
            }}
          />
          <Image
            source={require('./images/StarIcon.png')}
            style={{position: 'absolute', right: '9%', bottom: '28%'}}
          />
          <Image
            source={require('./images/StarIcon.png')}
            style={{position: 'absolute', right: '7%', bottom: '10%'}}
          />
          <Image
            source={require('./images/StarIcon.png')}
            style={{position: 'absolute', right: '4%', bottom: '29%'}}
          />
          <Image
            source={require('./images/StarIcon.png')}
            style={{position: 'absolute', right: '15%', bottom: '28%'}}
          />
          <Image
            source={require('./images/StarIcon.png')}
            style={{position: 'absolute', right: '14%', bottom: '11%'}}
          />
        </View>
        <View
          style={{
            backgroundColor: '#fff',
            width: (Dimensions.get('screen').width * 95) / 100,
            height: 2.5,
            marginTop: '4%',
            alignSelf: 'center',
          }}></View>
          <Text style={{color:"#A8A8A8",marginLeft:"2%",marginTop:"2%",fontSize:20,fontWeight:"bold"}}>Open and close the curtains</Text>
        <View style={{alignSelf:"center",marginTop:"5%"}}>
        <Slider
        onSlidingComplete={(value)=>{
          var dt = "";
          
          console.log(this.float2int(value));
          dt = "e,"+this.float2int(value);
          BleManager.getConnectedPeripherals([]).then((results) => {
            if (results.length == 0) {
              console.log('No connected peripherals');
            }
            //console.log(results);
            var peripherals = this.state.peripherals;
            for (var i = 0; i < results.length; i++) {
              var peripheral = results[i];
              peripheral.connected = true;
              peripherals.set(peripheral.id, peripheral);
              this.setState({peripherals});
              connectedId = peripheral.id;
            }
          });
          
            var newD = stringToBytes(dt);
          
          
          BleManager.write(
            dataStore.deviceUid,
            '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
            '6E400002-B5A3-F393-E0A9-E50E24DCCA9E',
            newD,
          )
            .then(() => {
                console.log('curtains : ' + newD);
              
            })
            .catch((error) => {
              if (error != null) {
                alert('error: ' + error);
              }
            });
        }}
    style={{width: 300, height: 40}}
    minimumValue={0}
    maximumValue={180}
    minimumTrackTintColor="#FFFFFF"
    maximumTrackTintColor="#000000"
  />
        </View>

       
      </View>
    );
  }
}
