package com.filetransfer.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;


import java.util.List;

@Configuration
@EnableConfigurationProperties(CorsProperties.class)
public class WebConfig {

    @Bean
    CorsConfigurationSource corsConfigurationSource(CorsProperties corsProperties) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(corsProperties.allowedOrigin()));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);

        var configSource = new UrlBasedCorsConfigurationSource();
        configSource.registerCorsConfiguration("/api/**", config);
        return configSource;
    }

    @Bean
    FilterRegistrationBean<CorsFilter> corsFilter(
           @Qualifier("corsConfigurationSource") CorsConfigurationSource source) {
        var registration = new FilterRegistrationBean<>(new CorsFilter(source));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }
}
