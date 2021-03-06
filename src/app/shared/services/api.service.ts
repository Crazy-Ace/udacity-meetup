import { Injectable} from '@angular/core';
import { Http } from '@angular/http';
import { SearchParamsService } from './search-params.service';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { EventsPipe } from '../pipes/events.pipe';
import 'rxjs/add/operator/map';

@Injectable()
export class ApiService {
  public preEvents$;
  public preVenues$;
  public preMedia$;
  public localEventId: number = 0;
  public events = [];
  public venues = {};
  public media = {};
  constructor(
    public http: Http,
    public searchParamsService: SearchParamsService) {
    this.preEvents$ = new BehaviorSubject(this.events);
    this.preVenues$ = new BehaviorSubject(this.venues);
    this.preMedia$ = new BehaviorSubject(this.media);
  }

  public observe(paramsObj, apiLocation) {
    let url: string
      = 'https://www.eventbriteapi.com/v3/'
      + apiLocation + '/?token=S6S7G427VEDSLNEQRE6B';
    let searchParams = this.searchParamsService.transform(paramsObj);
    return this.http.get(url, {
        search: searchParams
    })
    .map( (responseData) => {
      if (responseData.text().substring(0, 2) === '{"') {
        return responseData.json();
      }
    });
  }

  public getCordinates(address) {
    let key = 'AIzaSyBE1Bb86PEGx-11LahjWCZS2cFOWMpNseI';
    let url = 'https://maps.googleapis.com/maps/api/geocode/json?key=' + key;
    let searchParams = this.searchParamsService.transform({address: address});
    return this.http.get(url, {
        search: searchParams
    })
    .map( (responseData) => {
      return responseData.json();
    });
  }

  getEventDetails(eventId) {
    let index;
    for (let i = 0; i < this.events.length; i++) {
      if (eventId === this.events[i].id) {
        index = i;
      }
    }
    if (index !== undefined && !('details' in this.events[index])) {
      this.events[index].details = {};
      this.observe({}, 'venues/' + this.events[index].venue_id )
      .subscribe(data => {
          this.events[index].details.venue = data;
          this.checkIfDone(index);
      });
      this.observe({}, 'media/' + this.events[index].logo_id )
      .subscribe(data => {
          this.events[index].details.media = data;
          this.checkIfDone(index);
      });
    }
  }

  checkIfDone(index) {
    if ( ('venue' in this.events[index].details) &&
         ('media' in this.events[index].details) ) {
      this.updateEvents();
    }
  }

  public getlocalEventId(): string {
    this.localEventId++;
    let id = 'lc-' + Math.floor( Math.random() * 10000) + this.localEventId;
    return id;
  }

  loadEvents() {
    // Based off of IP
    this.http.get('https://geoip.nekudo.com/api')
    .map(responseData => {
      return responseData.json();
    }).subscribe(geoData => {
      for (let i = 1; i <= 4; i++) {
        let testParams = {
          'location.within': '10mi',
          'location.latitude': geoData.location.latitude,
          'location.longitude': geoData.location.longitude,
          'page': i
        };
        this.observe(testParams, 'events/search').subscribe(
          eventData => {
            if (eventData !== undefined) {
              this.events.push(...eventData.events);
              this.updateEvents();
            }
          },
          error => {
            let errorObj = JSON.parse( error._body );
            let message = errorObj.error_description;
            console.log( message );
          }
        );
      }
    });
  }

  updateEvents() {
    let filtered = new EventsPipe().transform(this.events);
    this.preEvents$.next( filtered );
  }

  public addEvent(data): void {
    this.events.push(data);
    this.updateEvents();
  }

  get events$() {
    return this.preEvents$.asObservable();
  }

  get venues$() {
    return this.preVenues$.asObservable();
  }

  get media$() {
    return this.preMedia$.asObservable();
  }

}

