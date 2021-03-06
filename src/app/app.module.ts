import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { RouterModule, Routes } from '@angular/router';
import { PlatformLocation, APP_BASE_HREF } from '@angular/common';

import { AppComponent } from './components/app/app.component';
import { IDRViewerComponent } from './components/idrviewer/idrviewer.component';
import { IDRViewerService } from './services/idrviewerservice';
import { ViewSelectComponent } from './components/viewselect/viewselect.component';

const appRoutes: Routes = [
  { path: '', redirectTo: '/select', pathMatch: 'full'  },
  { path: 'view/:id', component: IDRViewerComponent },
  { path: 'select', component: ViewSelectComponent }
];

export function getBaseHref(platformLocation: PlatformLocation): string {
  return platformLocation.getBaseHrefFromDOM();
}

@NgModule({
  declarations: [
    AppComponent,
    IDRViewerComponent,
    ViewSelectComponent
  ],
  imports: [
    BrowserModule,
    HttpModule,
    RouterModule.forRoot(appRoutes)
  ],
  providers: [
    IDRViewerService,
    {
      provide: APP_BASE_HREF,
      useFactory: getBaseHref,
      deps: [PlatformLocation]
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
