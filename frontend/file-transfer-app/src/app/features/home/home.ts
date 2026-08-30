import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    MatButton
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss', './home.tw.css'],
})
export class Home {

}
