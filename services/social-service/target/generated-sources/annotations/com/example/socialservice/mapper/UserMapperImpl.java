package com.example.socialservice.mapper;

import com.example.socialservice.dto.LoginResponse;
import com.example.socialservice.dto.RegisterResponse;
import com.example.socialservice.model.User;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2025-11-12T14:11:34+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 17.0.12 (Oracle Corporation)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public RegisterResponse toRegisterResponse(User user) {
        if ( user == null ) {
            return null;
        }

        RegisterResponse registerResponse = new RegisterResponse();

        registerResponse.setId( user.getId() );
        registerResponse.setEmail( user.getEmail() );
        registerResponse.setDisplayName( user.getDisplayName() );

        return registerResponse;
    }

    @Override
    public LoginResponse toLoginResponse(User user, String token) {
        if ( user == null && token == null ) {
            return null;
        }

        LoginResponse loginResponse = new LoginResponse();

        if ( user != null ) {
            loginResponse.setId( user.getId() );
            loginResponse.setEmail( user.getEmail() );
            loginResponse.setDisplayName( user.getDisplayName() );
        }
        loginResponse.setToken( token );

        return loginResponse;
    }
}
