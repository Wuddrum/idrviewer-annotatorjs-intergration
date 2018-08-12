import { IIDRViewerData } from './../../models/IDRViewerData';
import { IDRViewerService } from '../../services/idrviewerservice';
import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { Http } from '@angular/http';
import { ActivatedRoute, Router } from '@angular/router';
import { APP_BASE_HREF } from '@angular/common';
import * as $ from 'jquery';

declare const IDRViewer: any;
declare const IDRViewerController: any;
declare const annotator: any;
declare const annotatorImageSelectContainer: any;

@Component({
  selector: 'idrviewer',
  templateUrl: './idrviewer.component.html',
  styleUrls: ['./idrviewer.component.css']
})
export class IDRViewerComponent implements OnInit, OnDestroy {
  id: number;
  idrViewerData: IIDRViewerData;
  apps = [];
  zoomScale = 1.0;
  page = 1;

  constructor(private http: Http, private route: ActivatedRoute, private router: Router, private idrViewerService: IDRViewerService, @Inject(APP_BASE_HREF) private baseHref: string) {
    this.route.params.subscribe(p => {
      this.id = p['id'];
    });

    this.route.queryParams.subscribe(p => {
      let page = +p['page'];
      if (isNaN(page) || page <= 0) {
        // invalid page number
        this.page = 1;
      } else {
        this.page = page;
      }
    })
  }
  
  ngOnInit() {
    // fetch base url and any existing annotations from a fake service
    this.idrViewerData = this.idrViewerService.getIDRViewerDataById(this.id);

    this.http.get(this.baseHref + this.idrViewerData.baseUrl + 'config.js').subscribe(res => {
      // strip out json object from config.js file
      let configJson = res.text().slice(19, -1);
      let config = JSON.parse(configJson);
      this.initializeConfig(config);
    });
  }

  ngOnDestroy() {
    IDRViewer.off('pageload', this.handleIDRViewerPageLoad);
    IDRViewer.off('zoomchange', this.handleIDRViewerZoomChange);
    IDRViewer.off('pagechange', this.handleIDRViewerPageChange);
    this.apps.forEach(app => {
      app.destroy();
    });
    IDRViewerController.destroy_fullscreen();
  }

  private initializeConfig(config) {
    config.url = this.baseHref + this.idrViewerData.baseUrl;
    IDRViewerController.initialize_main();
    IDRViewerController.initialize_fullscreen();
    IDRViewerController.initialize_search();
    IDRViewerController.initialize_toolbar(this.baseHref + this.idrViewerData.baseUrl);
    IDRViewer.on('pageload', this.handleIDRViewerPageLoad.bind(this));
    IDRViewer.on('zoomchange', this.handleIDRViewerZoomChange.bind(this));
    IDRViewer.on('pagechange', this.handleIDRViewerPageChange.bind(this));
    IDRViewer.config = config;
    IDRViewer.goToPage(this.page);
    IDRViewer.setup();
  }

  private handleIDRViewerPageLoad(data) {
    let p = $("#p" + data.page);
    let pg = $("#pg" + data.page);
    let frame = $("#pdf" + data.page);

    // notice the usage of one instead of on
    frame.one("load", () => {
      let images = $("image", frame[0].contentDocument);
      images.each((idx, image) => {
        let overlayImg = new Image();
        let imgSrc = this.baseHref + this.idrViewerData.baseUrl + data.page + "/" + image.getAttribute("xlink:href");
        overlayImg.width = image.getAttribute("width");
        overlayImg.height = image.getAttribute("height");
        overlayImg.src = imgSrc;

        let overlayContainer = <HTMLDivElement>document.createElement("div");
        overlayContainer.style["position"] = "absolute";
        overlayContainer.style["z-index"] = 2;
        overlayContainer.style["left"] = image.getAttribute("x") + "px";
        overlayContainer.style["top"] = image.getAttribute("y") + "px";
        overlayContainer.appendChild(overlayImg);             
        pg.append(overlayContainer);

        var app = new annotator.App();
        app.include(annotatorImageSelectContainer, {
              element: $(overlayImg),
              container: p,
              suppressArrowKeys: true,
              scale: this.zoomScale
        }).include(this.annotationStorageModule(this.idrViewerData).module);
        this.apps.push(app);
        app.start();
        app.annotations.load({
          document_id: this.id,
          img_src: imgSrc
        });
      });
    });
  }

  private handleIDRViewerZoomChange(data) {
    this.zoomScale = data.zoomValue;
    this.apps.forEach(app => {
      app.modules.forEach(module => {
        if (module.isImgSelectContainerModule) {
          module.setScale(data.zoomValue);
        }
      });
    });
  }

  private handleIDRViewerPageChange(data) {
    this.page = data.page;
    this.router.navigate([], { queryParams: { page: data.page }, replaceUrl: true });
  }

  // a quick example storage module
  private annotationStorageModule(idrViewerData: IIDRViewerData) {
    return {
      module() {
        return {
          create(annotation) {
            // a new annotation is created, id MUST be assigned (probably returned by API)
            annotation.id = (Math.random() + 1).toString(36).slice(-4);
            return annotation;
          },
    
          update(annotation) {
            // an annotation is updated
            return annotation;
          },
    
          delete(annotation) {
            // an annotation is deleted
            return annotation;
          },
    
          query(queryObj) {
            // an image gets attached to annotator and a query gets issued for any existing annotations
            // sort pre-loaded annotations by query or submit query to API
            // queryObj.document_id = id of the idrviewer document (this.id)
            // queryObj.img_src = src attribute of the image that is queried for annotations
            let annotations = idrViewerData.annotations.filter(a => a.image_selection.src === queryObj.img_src);
            return {results: annotations, meta: {total: annotations.length}};
          },
    
          configure(registry) {
            registry.registerUtility(this, 'storage');
          }
        }
      }
    }
  }
}
