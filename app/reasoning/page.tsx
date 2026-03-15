import Image from "next/image";
import styled from "styled-components";
import Link from 'next/link'

const ReasoningPage = styled.div`
  width: 100%;
  min-height: 100vh;
  text-align: center;
  background-color: #f2fff5;

  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Header = styled.div`
  width: 100%;
  height: 120px;
  text-align: center;
  background-color: #ffffff;
  border-bottom: 3.5px solid #253d2c;
  box-shadow: 0px 7px 10px rgba(0, 0, 0, 0.3);

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;


const ViewLogicButton = styled.button`
  width: 50%;
  height: 120px;
  text-align: center;
  background-color: #ffffff;
  border: 3.5px solid #2e6f40;
  border-radius: 25px;
  margin-top: 65px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: #68ba7f;
    transform: scale(1.05);
    color: white;
  }
`;

const LinkHome = styled(Link)`
    text-decoration: underline;
    position: absolute;
    margin-left: 80%
`

export default function Home() {
  

  return (
    <ReasoningPage>
      <Header>
        <Image
          src="/medichainLogo.png"
          alt="Medichain logo"
          width={200}
          height={200}
          style={{ position: "absolute", marginRight: "80%" }}
        />
        <LinkHome href="/">Back to ChatBot</LinkHome>
      </Header>
      <ViewLogicButton>View Interviewer Agent Logic</ViewLogicButton>
      <ViewLogicButton>View Retrieved Knowledge Graph</ViewLogicButton>
      <ViewLogicButton>View Diagnostic Agent Logic</ViewLogicButton>
    </ReasoningPage>
  );
}
