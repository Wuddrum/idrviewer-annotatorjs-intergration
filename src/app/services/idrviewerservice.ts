import { IIDRViewerData } from '../models/IDRViewerData';
import { ElementFinder } from 'protractor';

// dummy service
export class IDRViewerService {
    getIDRViewerDataById(id: number): IIDRViewerData {
        if (id == 1) {
            let data: IIDRViewerData = {
                id: 1,
                baseUrl: '/assets/07_lowest_floor_guide_508_oct2017_2/',
                annotations: []
            };
            return data;
        } else {
            let data: IIDRViewerData = {
                id: 2,
                baseUrl: '/assets/07_lowest_floor_guide_508_oct2017_2/',
                annotations: [
                    {
                        id: "x314",
                        image_selection: {
                            h: "33.49%",
                            src: "/assets/07_lowest_floor_guide_508_oct2017_2/30/img/1.png",
                            uri: "http://localhost:4200/assets/07_lowest_floor_guide_508_oct2017_2/30/img/1.png",
                            w: "24.48%",
                            x: "16.32%",
                            y: "38.28%"
                        },
                        quote: "",
                        ranges: [],
                        text: "some example annotation about windows"
                    },
                    {
                        id: "kjpl",
                        image_selection: {
                            h: "34.45%",
                            src: "/assets/07_lowest_floor_guide_508_oct2017_2/30/img/1.png",
                            uri: "http://localhost:4200/assets/07_lowest_floor_guide_508_oct2017_2/30/img/1.png",
                            w: "11.89%",
                            x: "58.04%",
                            y: "45.45%"
                        },
                        quote: "",
                        ranges: [],
                        text: "door annotation"
                    },
                    {
                        id: "cmhk",
                        image_selection: {
                            h: "81.25%",
                            src: "/assets/07_lowest_floor_guide_508_oct2017_2/31/img/1.png",
                            uri: "http://localhost:4200/assets/07_lowest_floor_guide_508_oct2017_2/31/img/1.png",
                            w: "62.30%",
                            x: "19.20%",
                            y: "7.69%"
                        },
                        quote: "",
                        ranges: [],
                        text: "a whole house annotation"
                    }
                ]
            };
            return data;
        }
    }
}