package devPilot.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import devPilot.backend.security.GithubOauth2UserService;
import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final GithubOauth2UserService gitHubOAuth2UserService;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, @Value("${app.frontend-url}") String frontendUrl)
            throws Exception {
        AuthenticationSuccessHandler oauth2SucessHandler = oauth2SucessHandler(frontendUrl);
        AuthenticationFailureHandler oauth2FailureHandler = oauth2FailureHandler(frontendUrl);
        http.cors(Customizer.withDefaults()).csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .authorizeHttpRequests(
                        auth -> auth.requestMatchers("/api/auth/login-url", "/oauth2/**", "/login/oauth2/**", "/error")
                                .permitAll().requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                                .requestMatchers("/api/**").authenticated().anyRequest().permitAll())
                .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .oauth2Login(oauth -> oauth.userInfoEndpoint(userInfo -> userInfo.userService(gitHubOAuth2UserService))
                        .successHandler(oauth2SucessHandler).failureHandler(oauth2FailureHandler))
                .logout(logout -> logout.logoutUrl("/api/auth/logout")
                        .logoutSuccessHandler((request, response, authentication) -> response
                                .setStatus(HttpStatus.NO_CONTENT.value()))
                        .invalidateHttpSession(true).clearAuthentication(true).deleteCookies("DEVPILOT_SESSION"));
        return http.build();
    }

    AuthenticationSuccessHandler oauth2SucessHandler(String frontendUrl) {
        SimpleUrlAuthenticationSuccessHandler handler = new SimpleUrlAuthenticationSuccessHandler();
        handler.setDefaultTargetUrl(frontendUrl + "/auth/callback");
        return handler;
    }

    AuthenticationFailureHandler oauth2FailureHandler(String frontendUrl) {
        SimpleUrlAuthenticationFailureHandler handler = new SimpleUrlAuthenticationFailureHandler();
        handler.setDefaultFailureUrl(frontendUrl + "/login?error=oauth_failed");
        return handler;
    }
}