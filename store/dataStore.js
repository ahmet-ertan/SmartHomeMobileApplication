import {observable} from "mobx";

class dataStore{

    @observable deviceUid = "";
}
export default new dataStore()